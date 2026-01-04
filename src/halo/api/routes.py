"""
REST API routes for HALO web application.
"""

from flask import Blueprint, jsonify, request, current_app
from pathlib import Path
from typing import Dict, Any
from halo.io.csv_handler import ObservationCSV

api_blueprint = Blueprint('api', __name__, url_prefix='/api')


def get_days_in_month(month: int, year: int) -> int:
    """Get number of days in a month, handling leap years.
    
    Args:
        month: Month (1-12)
        year: 2-digit year (0-99)
    
    Returns:
        Number of days in the month (28-31)
    """
    days_per_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    
    if month < 1 or month > 12:
        return 30  # Fallback
    
    days = days_per_month[month - 1]
    
    # Check for leap year in February
    if month == 2:
        # Convert 2-digit year to 4-digit
        full_year = year + 2000 if year < 50 else year + 1900
        # Simple leap year check (divisible by 4)
        if full_year % 4 == 0:
            days = 29
    
    return days


def _format_lp8(e: int, ho: int | None, hu: int | None) -> str:
    """Direct translation of Pascal Kurzausgabe for the 8HO/HU field.

    Pascal reference:
        IF E=8 THEN IF ho=-1 THEN '8////' ELSE '8' + HO + '//'
        ELSE IF E=9 THEN IF hu=-1 THEN '8////' ELSE '8//' + HU
        ELSE IF E=10 THEN '8' + (HO or '//') + (HU or '//')
        ELSE '/////'
    """
    # Treat None the same as -1 (unknown)
    ho_unknown = (ho is None) or (ho == -1)
    hu_unknown = (hu is None) or (hu == -1)

    if e == 8:
        if ho_unknown:
            return '8////'
        return '8' + f"{ho:02d}" + '//'
    elif e == 9:
        if hu_unknown:
            return '8////'
        return '8//' + f"{hu:02d}"
    elif e == 10:
        s = '8'
        s += '//' if ho_unknown else f"{ho:02d}"
        s += '//' if hu_unknown else f"{hu:02d}"
        return s
    else:
        return '/////'


@api_blueprint.route('/health', methods=['GET'])
def health_check() -> Dict[str, Any]:
    return jsonify({'status': 'ok', 'version': '3.0.0', 'service': 'HALO API'})


@api_blueprint.route('/language', methods=['GET'])
def get_language() -> Dict[str, Any]:
    """Get current language from session."""
    from flask import session
    language = session.get('language', 'de')
    return jsonify({'language': language})


@api_blueprint.route('/language/<lang>', methods=['POST'])
def set_language(lang: str) -> Dict[str, Any]:
    """Set language in session and i18n system."""
    from flask import session
    from halo.resources import set_language as set_lang
    
    if lang not in ['de', 'en']:
        return jsonify({'error': 'Invalid language. Supported: de, en'}), 400
    
    # Update session
    session['language'] = lang
    
    # Update i18n instance
    set_lang(lang)
    
    return jsonify({'success': True, 'language': lang})


@api_blueprint.route('/i18n/<lang>', methods=['GET'])
def get_i18n_strings(lang: str) -> Dict[str, Any]:
    """Get all i18n strings for specified language."""
    from halo.resources import I18n
    try:
        i18n = I18n(lang)
        return jsonify(i18n.strings)
    except FileNotFoundError:
        return jsonify({'error': f'Language {lang} not found'}), 404


@api_blueprint.route('/whats-new/<lang>', methods=['GET'])
def get_whats_new(lang: str) -> Dict[str, Any]:
    # Resources are at project root level
    resources_dir = Path(__file__).parent.parent.parent.parent / 'resources'

    # Prefer language-specific .md, then generic .md (no .txt fallback)
    candidates = [
        resources_dir / f'whats_new_{lang}.md',
        resources_dir / 'whats_new.md',
    ]

    whats_new_file = next((p for p in candidates if p.exists()), None)
    if not whats_new_file:
        return jsonify({'error': "What's New file not found"}), 404

    try:
        with open(whats_new_file, 'r', encoding='utf-8') as f:
            content = f.read()

        fmt = 'markdown' if whats_new_file.suffix.lower() == '.md' else 'text'
        return jsonify({'language': lang, 'content': content, 'format': fmt})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/help/<lang>', methods=['GET'])
def get_help(lang: str) -> Dict[str, Any]:
    # Resources are at project root level
    resources_dir = Path(__file__).parent.parent.parent.parent / 'resources'

    # Prefer language-specific .md, then generic .md
    candidates = [
        resources_dir / f'help_{lang}.md',
        resources_dir / 'help.md',
    ]

    help_file = next((p for p in candidates if p.exists()), None)
    if not help_file:
        return jsonify({'error': "Help file not found"}), 404

    try:
        with open(help_file, 'r', encoding='utf-8') as f:
            content = f.read()

        fmt = 'markdown' if help_file.suffix.lower() == '.md' else 'text'
        return jsonify({'language': lang, 'content': content, 'format': fmt})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/observations', methods=['GET'])
def get_observations() -> Dict[str, Any]:
    """
    Get observations from the currently loaded file (in memory) with optional pagination.

    Query parameters:
    - limit: Maximum number of results (default 100, <=0 returns all)
    - offset: Pagination offset (default 0)
    """
    limit = int(request.args.get('limit', 100))
    offset = int(request.args.get('offset', 0))

    # Get in-memory data loaded via /file/upload or /file/load
    observations = current_app.config.get('OBSERVATIONS') or []
    loaded_file = current_app.config.get('LOADED_FILE')

    total = len(observations)
    # Support limit <= 0 meaning "fetch all" from the current offset
    if limit <= 0:
        paginated = observations[offset:]
    else:
        paginated = observations[offset:offset + limit]

    result = {
        'total': total,
        'offset': offset,
        'limit': limit,
        'count': len(paginated),
        'file': loaded_file,
        'observations': [
            {
                'KK': obs.KK if obs.KK != -1 else None,
                'O': obs.O if obs.O != -1 else None,
                'JJ': obs.JJ if obs.JJ != -1 else None,
                'MM': obs.MM if obs.MM != -1 else None,
                'TT': obs.TT if obs.TT != -1 else None,
                'GG': obs.GG if obs.GG != -1 else None,
                'ZS': obs.ZS if obs.ZS != -1 else None,
                'ZM': obs.ZM if obs.ZM != -1 else None,
                'd': obs.d if obs.d != -1 else None,
                'DD': obs.DD if obs.DD != -1 else None,
                'N': obs.N if obs.N != -1 else None,
                'C': obs.C if obs.C != -1 else None,
                'c': obs.c if obs.c != -1 else None,
                'EE': obs.EE if obs.EE != -1 else None,
                'H': obs.H if obs.H != -1 else None,
                'F': obs.F if obs.F != -1 else None,
                'V': obs.V if obs.V != -1 else None,
                'f': obs.f if obs.f != -1 else None,
                'zz': obs.zz if obs.zz not in (-1, 99) else (0 if obs.zz == 99 else None),
                'g': obs.g if obs.g != -1 else None,
                'HO': obs.HO if obs.HO != -1 else None,
                'HU': obs.HU if obs.HU != -1 else None,
                # Precomputed light pillar field using Pascal's exact logic
                'lp8': _format_lp8(obs.EE, obs.HO if obs.HO != -1 else None, obs.HU if obs.HU != -1 else None),
                'sectors': getattr(obs, 'sectors', ''),
                'remarks': getattr(obs, 'remarks', ''),
            }
            for obs in paginated
        ],
    }

    return jsonify(result)


def _spaeter(a, b) -> int:
    """Compare two observations for sort order.
    
    Pascal function spaeter() translation.
    Sort criteria: J → M → T → ZS → ZM → K → E → gg
    
    Returns:
        -1 if a comes before b
         0 if a and b are equal (same position)
         1 if a comes after b
    """
    spt = -1
    
    # Year comparison with century wrap (50 = cutoff for 1950/2050)
    hilf = (((a.JJ > b.JJ) and not ((a.JJ >= 50) and (b.JJ < 50))) or
            ((a.JJ < 50) and (b.JJ >= 50)))
    
    if a.JJ == b.JJ:
        hilf = a.MM > b.MM
        if a.MM == b.MM:
            hilf = a.TT > b.TT
            if a.TT == b.TT:
                hilf = a.ZS > b.ZS
                if a.ZS == b.ZS:
                    hilf = a.ZM > b.ZM
                    if a.ZM == b.ZM:
                        hilf = a.KK > b.KK
                        if a.KK == b.KK:
                            hilf = a.EE > b.EE
                            if a.EE == b.EE:
                                hilf = a.GG > b.GG
                                if a.GG == b.GG:
                                    spt = 0
    
    if hilf:
        spt = 1
    
    return spt


@api_blueprint.route('/observations', methods=['POST'])
def add_observation() -> Dict[str, Any]:
    """Add a new observation to the in-memory list at the correct sorted position (Zahleneingabe)."""
    from flask import current_app, request
    data = request.get_json() or {}

    # Minimal validation
    required_fields = ['KK','O','JJ','MM','TT','GG','EE','g']
    for f in required_fields:
        if f not in data:
            return jsonify({'error': f'Missing field: {f}'}), 400

    try:
        from halo.models.types import Observation
        obs = Observation()
        # Assign fields with defaults for unknowns
        for field in ['KK','O','JJ','MM','TT','GG','ZS','ZM','DD','d','N','C','c','EE','H','F','V','f','zz','g','HO','HU']:
            if field in data and data[field] is not None:
                setattr(obs, field, int(data[field]))
        obs.sectors = data.get('sectors', '') or ''
        obs.remarks = data.get('remarks', '') or ''

        observations = current_app.config.get('OBSERVATIONS') or []
        
        # Find correct insertion position using spaeter() comparison
        insert_pos = len(observations)
        for i, existing in enumerate(observations):
            if _spaeter(obs, existing) < 1:  # obs comes before or equal to existing
                insert_pos = i
                break
        
        observations.insert(insert_pos, obs)
        current_app.config['OBSERVATIONS'] = observations
        current_app.config['DIRTY'] = True

        return jsonify({'success': True, 'count': len(observations)})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@api_blueprint.route('/observations/delete', methods=['POST'])
def delete_observation() -> Dict[str, Any]:
    """Delete an observation by matching its field values."""
    from flask import current_app, request
    data = request.get_json() or {}

    try:
        observations = current_app.config.get('OBSERVATIONS') or []
        
        # Find observation to delete by matching key fields
        # Match by: KK, O, JJ, MM, TT, EE, GG (unique identifier)
        original_obs = None
        for i, obs in enumerate(observations):
            if (obs.KK == data.get('KK') and
                obs.O == data.get('O') and
                obs.JJ == data.get('JJ') and
                obs.MM == data.get('MM') and
                obs.TT == data.get('TT') and
                obs.EE == data.get('EE') and
                obs.GG == data.get('GG')):
                original_obs = i
                break
        
        if original_obs is not None:
            observations.pop(original_obs)
            current_app.config['OBSERVATIONS'] = observations
            current_app.config['DIRTY'] = True
            return jsonify({'success': True, 'deleted': True, 'count': len(observations)})
        else:
            return jsonify({'success': False, 'deleted': False, 'count': len(observations)})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@api_blueprint.route('/observations/<int:obs_id>', methods=['GET'])
def get_observation(obs_id: int) -> Dict[str, Any]:
    """Get single observation by ID."""
    # TODO: Implement observation retrieval by ID
    return jsonify({'error': 'Not implemented yet'}), 501


@api_blueprint.route('/statistics', methods=['GET'])
def get_statistics() -> Dict[str, Any]:
    """
    Get database statistics.
    
    Returns:
        JSON object with:
        - total_observations
        - date_range
        - observers_count
        - halo_types_distribution
        - regions_distribution
    """
    from halo.io.csv_handler import ObservationCSV
    from collections import Counter
    
    csv_handler = ObservationCSV()
    data_path = Path(__file__).parent.parent.parent.parent / 'data' / 'ALLE.CSV'
    
    try:
        observations = csv_handler.read_observations(str(data_path))
        
        # Calculate statistics
        years = [obs.JJ for obs in observations]
        halo_types = Counter(obs.EE for obs in observations)
        regions = Counter(obs.GG for obs in observations)
        observers = set(obs.KK for obs in observations)
        
        result = {
            'total_observations': len(observations),
            'date_range': {
                'start': min(years) if years else None,
                'end': max(years) if years else None
            },
            'observers_count': len(observers),
            'top_halo_types': dict(halo_types.most_common(10)),
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/files', methods=['GET'])
def list_files() -> Dict[str, Any]:
    """List available .HAL and .CSV files in data directory"""
    from flask import current_app
    from pathlib import Path
    import os
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    if not datapath.exists():
        return jsonify({'error': 'Data directory not found'}), 404
    
    try:
        files = []
        for filename in os.listdir(str(datapath)):
            if filename.endswith('.HAL') or filename.endswith('.CSV') or filename.endswith('.hal') or filename.endswith('.csv'):
                filepath = os.path.join(str(datapath), filename)
                stat = os.stat(filepath)
                files.append({
                    'name': filename,
                    'size': stat.st_size,
                    'modified': stat.st_mtime
                })
        
        files.sort(key=lambda x: x['name'])
        return jsonify({'files': files, 'directory': str(datapath)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/new', methods=['POST'])
def new_file() -> Dict[str, Any]:
    """Create new empty file - implements 'Datei -> neue Datei'"""
    from flask import current_app, request
    import os
    
    data = request.get_json()
    filename = data.get('filename', '')
    
    if not filename:
        return jsonify({'error': 'Filename is required'}), 400
    
    # Ensure .CSV extension
    if not filename.endswith('.CSV') and not filename.endswith('.csv'):
        filename += '.CSV'
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    filepath = os.path.join(str(datapath), filename)
    
    if os.path.exists(filepath):
        return jsonify({'error': 'File already exists'}), 400
    
    try:
        # Create empty CSV with header
        ObservationCSV.write_observations(Path(filepath), [])
        
        current_app.config['LOADED_FILE'] = filename
        current_app.config['OBSERVATIONS'] = []
        current_app.config['DIRTY'] = False
        
        return jsonify({
            'success': True,
            'filename': filename,
            'message': 'Neue Datei erstellt!'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/upload', methods=['POST'])
def upload_file() -> Dict[str, Any]:
    """Upload and load a file from user's filesystem directly into memory."""
    from flask import current_app
    from io import StringIO
    import csv
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Only CSV files are supported'}), 400
    
    try:
        # Read file content directly into memory (HALO CSV is latin-1)
        content = file.read().decode('latin-1')
        file_object = StringIO(content)
        
        # Parse CSV directly from memory
        observations = ObservationCSV.read_observations_from_stream(file_object)
        
        # Store in app config
        current_app.config['LOADED_FILE'] = file.filename
        current_app.config['OBSERVATIONS'] = observations
        current_app.config['DIRTY'] = False
        
        return jsonify({
            'success': True,
            'filename': file.filename,
            'count': len(observations),
            'message': f'{len(observations)} Beobachtungen geladen!'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/load/<filename>', methods=['POST'])
def load_file(filename: str) -> Dict[str, Any]:
    """Load observation file - implements 'Datei -> Laden' from HALO.PAS laden()"""
    from flask import current_app
    from pathlib import Path
    import os
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    filepath = os.path.join(str(datapath), filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    try:
        observations = ObservationCSV.read_observations(Path(filepath))
        
        # Store in app config
        current_app.config['LOADED_FILE'] = filename
        current_app.config['OBSERVATIONS'] = observations
        current_app.config['DIRTY'] = False
        
        return jsonify({
            'success': True,
            'filename': filename,
            'count': len(observations),
            'message': f'{len(observations)} Beobachtungen geladen!'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/save', methods=['POST'])
def save_file() -> Dict[str, Any]:
    """Save current observations to disk - implements 'Datei -> Speichern'"""
    from flask import current_app
    import os
    
    filename = current_app.config.get('LOADED_FILE')
    if not filename:
        return jsonify({'error': 'No file loaded'}), 400
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    filepath = os.path.join(str(datapath), filename)
    observations = current_app.config.get('OBSERVATIONS', [])
    
    try:
        ObservationCSV.write_observations(Path(filepath), observations)
        
        current_app.config['DIRTY'] = False
        
        return jsonify({
            'success': True,
            'filename': filename,
            'count': len(observations),
            'message': f'{len(observations)} Beobachtungen gespeichert!'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/saveas', methods=['POST'])
def save_file_as() -> Dict[str, Any]:
    """Save as new file - implements 'Datei -> als ... speichern'"""
    from flask import current_app, request
    import os
    
    data = request.get_json()
    filename = data.get('filename', '')
    overwrite = data.get('overwrite', False)
    
    if not filename:
        return jsonify({'error': 'Filename is required'}), 400
    
    # Ensure .CSV extension
    if not filename.endswith('.CSV') and not filename.endswith('.csv'):
        filename += '.CSV'
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    filepath = os.path.join(str(datapath), filename)
    
    if os.path.exists(filepath) and not overwrite:
        return jsonify({'exists': True, 'message': 'File exists. Overwrite?'}), 200
    
    observations = current_app.config.get('OBSERVATIONS', [])
    
    try:
        ObservationCSV.write_observations(Path(filepath), observations)
        
        current_app.config['LOADED_FILE'] = filename
        current_app.config['DIRTY'] = False
        
        return jsonify({
            'success': True,
            'filename': filename,
            'count': len(observations),
            'message': f'{len(observations)} Beobachtungen gespeichert!'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/status', methods=['GET'])
def file_status() -> Dict[str, Any]:
    """Get current file status (loaded file, dirty state)"""
    from flask import current_app
    
    auto_loaded = current_app.config.get('AUTO_LOADED', False)
    # Clear the flag after first check
    if auto_loaded:
        current_app.config['AUTO_LOADED'] = False
    
    return jsonify({
        'filename': current_app.config.get('LOADED_FILE'),
        'dirty': current_app.config.get('DIRTY', False),
        'count': len(current_app.config.get('OBSERVATIONS', [])),
        'auto_loaded': auto_loaded
    })


@api_blueprint.route('/file/autosave', methods=['POST'])
def autosave() -> Dict[str, Any]:
    """Auto-save current observations to .$$$ temp file"""
    from flask import current_app
    import os
    
    filename = current_app.config.get('LOADED_FILE')
    if not filename:
        return jsonify({'error': 'No file loaded'}), 400
    
    observations = current_app.config.get('OBSERVATIONS', [])
    if not observations:
        return jsonify({'error': 'No observations to save'}), 400
    
    # Create temp filename with .$$$ extension
    base_name = os.path.splitext(filename)[0]
    temp_filename = f"{base_name}.$$$"
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    temp_filepath = datapath / temp_filename
    
    try:
        ObservationCSV.write_observations(temp_filepath, observations)
        return jsonify({
            'success': True,
            'temp_file': temp_filename,
            'count': len(observations)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/check_autosave', methods=['GET'])
def check_autosave() -> Dict[str, Any]:
    """Check if any .$$$ autosave files exist in data directory"""
    from flask import current_app
    import os
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    
    if not datapath.exists():
        return jsonify({'found': False})
    
    # Find all .$$$ files
    autosave_files = list(datapath.glob('*.$$$'))
    
    if not autosave_files:
        return jsonify({'found': False})
    
    # Get the most recent one
    most_recent = max(autosave_files, key=lambda p: p.stat().st_mtime)
    original_name = most_recent.stem + '.CSV'
    
    return jsonify({
        'found': True,
        'temp_file': most_recent.name,
        'original_file': original_name,
        'modified': most_recent.stat().st_mtime
    })


@api_blueprint.route('/file/restore_autosave', methods=['POST'])
def restore_autosave() -> Dict[str, Any]:
    """Restore observations from .$$$ autosave file"""
    from flask import current_app, request
    import os
    
    data = request.get_json() or {}
    temp_filename = data.get('temp_file')
    
    if not temp_filename:
        return jsonify({'error': 'Temp filename required'}), 400
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    temp_filepath = datapath / temp_filename
    
    if not temp_filepath.exists():
        return jsonify({'error': 'Autosave file not found'}), 404
    
    try:
        # Load observations from temp file
        observations = ObservationCSV.read_observations(temp_filepath)
        
        # Store in app config
        current_app.config['OBSERVATIONS'] = observations
        
        # Set original filename (without .$$$)
        original_name = os.path.splitext(temp_filename)[0] + '.CSV'
        current_app.config['LOADED_FILE'] = original_name
        current_app.config['DIRTY'] = True  # Mark as dirty since restored from temp
        
        # Delete the temp file
        try:
            temp_filepath.unlink()
        except Exception:
            pass  # Ignore deletion errors
        
        return jsonify({
            'success': True,
            'filename': original_name,
            'count': len(observations),
            'message': f'Restored {len(observations)} observations from autosave'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_blueprint.route('/file/cleanup_autosave', methods=['POST'])
def cleanup_autosave() -> Dict[str, Any]:
    """Delete .$$$ autosave file after successful save"""
    from flask import current_app
    import os
    
    filename = current_app.config.get('LOADED_FILE')
    if not filename:
        return jsonify({'success': True})  # No file loaded, nothing to clean
    
    # Create temp filename with .$$$ extension
    base_name = os.path.splitext(filename)[0]
    temp_filename = f"{base_name}.$$$"
    
    datapath = Path(__file__).parent.parent.parent.parent / 'data'
    temp_filepath = datapath / temp_filename
    
    try:
        if temp_filepath.exists():
            temp_filepath.unlink()
            return jsonify({'success': True, 'deleted': temp_filename})
        else:
            return jsonify({'success': True, 'message': 'No autosave file to delete'})
    except Exception as e:
        # Don't fail if cleanup fails
        return jsonify({'success': True, 'warning': str(e)})


@api_blueprint.route('/config/inputmode', methods=['GET', 'POST'])
def inputmode() -> Dict[str, Any]:
    """Get or set Eingabeart (input mode) - implements 'Einstellungen -> Eingabeart' from H_BEOBNG.PAS"""
    from flask import current_app, request
    
    if request.method == 'POST':
        data = request.get_json()
        mode = data.get('mode', 'N')
        
        if mode not in ['M', 'N']:
            return jsonify({'error': 'Invalid mode. Must be M or N'}), 400
        
        current_app.config['INPUT_MODE'] = mode
        # Persist setting
        from pathlib import Path
        root_path = Path(__file__).parent.parent.parent.parent
        from halo.services.settings import Settings
        Settings.save_key(current_app.config, root_path, 'INPUT_MODE', mode)
        
        return jsonify({
            'success': True,
            'mode': mode,
            'display': 'lang' if mode == 'M' else 'kurz'
        })
    else:
        mode = current_app.config.get('INPUT_MODE', 'N')
        return jsonify({
            'mode': mode,
            'display': 'lang' if mode == 'M' else 'kurz'
        })


@api_blueprint.route('/config/fixed_observer', methods=['GET', 'POST'])
def fixed_observer() -> Dict[str, Any]:
    """Get or set fixed observer (fester Beobachter)"""
    from flask import current_app, request
    
    if request.method == 'POST':
        data = request.get_json()
        observer = data.get('observer', '')
        
        current_app.config['FIXED_OBSERVER'] = observer
        # Persist setting
        from pathlib import Path
        root_path = Path(__file__).parent.parent.parent.parent
        from halo.services.settings import Settings
        Settings.save_key(current_app.config, root_path, 'FIXED_OBSERVER', observer)
        
        return jsonify({
            'success': True,
            'observer': observer
        })
    else:
        observer = current_app.config.get('FIXED_OBSERVER', '')
        return jsonify({
            'observer': observer
        })


@api_blueprint.route('/config/active_observers', methods=['GET', 'POST'])
def active_observers_setting() -> Dict[str, Any]:
    """Get or set the 'aktive Beobachter' setting.

    This setting controls whether only active observers should be considered.
    As requested, this setting does not change current observers or observations menus behavior.
    """
    from flask import current_app, request

    if request.method == 'POST':
        data = request.get_json() or {}
        enabled = bool(data.get('enabled', False))
        current_app.config['ACTIVE_OBSERVERS_ONLY'] = enabled
        # Persist setting
        from pathlib import Path
        root_path = Path(__file__).parent.parent.parent.parent
        from halo.services.settings import Settings
        Settings.save_key(current_app.config, root_path, 'ACTIVE_OBSERVERS_ONLY', '1' if enabled else '0')
        return jsonify({
            'success': True,
            'enabled': enabled
        })
    else:
        enabled = bool(current_app.config.get('ACTIVE_OBSERVERS_ONLY', False))
        return jsonify({'enabled': enabled})


@api_blueprint.route('/config/startup_file', methods=['GET', 'POST'])
def startup_file_setting() -> Dict[str, Any]:
    """Get or set the startup file setting.
    
    This setting controls whether a file should be automatically loaded on program start.
    """
    from flask import current_app, request
    
    if request.method == 'POST':
        data = request.get_json() or {}
        enabled = bool(data.get('enabled', False))
        file_path = data.get('file_path', '')
        
        current_app.config['STARTUP_FILE_ENABLED'] = enabled
        current_app.config['STARTUP_FILE_PATH'] = file_path if enabled else ''
        
        # Persist settings
        from pathlib import Path
        root_path = Path(__file__).parent.parent.parent.parent
        from halo.services.settings import Settings
        Settings.save_key(current_app.config, root_path, 'STARTUP_FILE_ENABLED', '1' if enabled else '0')
        Settings.save_key(current_app.config, root_path, 'STARTUP_FILE_PATH', file_path if enabled else '')
        
        return jsonify({
            'success': True,
            'enabled': enabled,
            'file_path': file_path
        })
    else:
        enabled = bool(current_app.config.get('STARTUP_FILE_ENABLED', False))
        file_path = current_app.config.get('STARTUP_FILE_PATH', '')
        return jsonify({
            'enabled': enabled,
            'file_path': file_path
        })


@api_blueprint.route('/monthly-report', methods=['GET'])
def get_monthly_report() -> Dict[str, Any]:
    """Generate monthly report (Monatsmeldung) for a specific observer and month.
    
    Query parameters:
        kk: Observer code (required)
        mm: Month 1-12 (required)
        jj: Year 0-99 (required)
    """
    from flask import current_app
    
    # Check if observations are loaded
    observations = current_app.config.get('OBSERVATIONS', [])
    if not observations:
        return jsonify({'error': 'No observations loaded. Please load a file first.'}), 400
    
    kk = request.args.get('kk', '').strip()
    mm = request.args.get('mm', '').strip()
    jj = request.args.get('jj', '').strip()
    
    if not all([kk, mm, jj]):
        return jsonify({'error': 'Missing required parameters: kk, mm, jj'}), 400
    
    try:
        kk_int = int(kk)
        mm_int = int(mm)
        jj_int = int(jj)
        
        if mm_int < 1 or mm_int > 12:
            return jsonify({'error': 'Invalid month (1-12)'}), 400
        if jj_int < 0 or jj_int > 99:
            return jsonify({'error': 'Invalid year (0-99)'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid numeric parameters'}), 400
    
    # Filter observations for this observer and month
    filtered_obs = [obs for obs in observations 
                    if obs.KK == kk_int and obs.MM == mm_int and obs.JJ == jj_int]
    
    # Sort by day and time
    filtered_obs.sort(key=lambda o: (o.TT, o.ZS if o.ZS != -1 else 0, o.ZM if o.ZM != -1 else 0))
    
    # Get observer info
    observers = current_app.config.get('OBSERVERS', [])
    observer_name = ''
    observer_hbort = ''
    observer_nbort = ''
    observer_gh = ''
    observer_gn = ''
    
    # Get region names from i18n
    from flask import g
    regions = g.i18n.get_array('geographic_regions') if hasattr(g, 'i18n') else {}
    
    for obs_rec in observers:
        if len(obs_rec) >= 21 and obs_rec[0] == kk:
            observer_name = f"{obs_rec[1]} {obs_rec[2]}"
            observer_hbort = obs_rec[5]
            observer_nbort = obs_rec[13]
            # Get region indices - obs_rec[6] is GH, obs_rec[14] is GN
            try:
                gh_idx = int(obs_rec[6]) if obs_rec[6] else 0
                gn_idx = int(obs_rec[14]) if obs_rec[14] else 0
                observer_gh = regions.get(str(gh_idx), '') if gh_idx > 0 else ''
                observer_gn = regions.get(str(gn_idx), '') if gn_idx > 0 else ''
            except (ValueError, IndexError):
                observer_gh = ''
                observer_gn = ''
            # Combine site and region
            observer_hbort = f"{observer_hbort} ({observer_gh})" if observer_gh else observer_hbort
            observer_nbort = f"{observer_nbort} ({observer_gn})" if observer_gn else observer_nbort
            break
    
    return jsonify({
        'kk': kk_int,
        'mm': mm_int,
        'jj': jj_int,
        'observer_name': observer_name,
        'observer_hbort': observer_hbort,
        'observer_nbort': observer_nbort,
        'observer_gh': observer_gh,
        'observer_gn': observer_gn,
        'observations': [
            {
                'KK': obs.KK,
                'O': obs.O,
                'JJ': obs.JJ,
                'MM': obs.MM,
                'TT': obs.TT,
                'g': obs.g,
                'ZS': obs.ZS if obs.ZS != -1 else None,
                'ZM': obs.ZM if obs.ZM != -1 else None,
                'd': obs.d if obs.d != -1 else None,
                'DD': obs.DD if obs.DD != -1 else None,
                'N': obs.N if obs.N != -1 else None,
                'C': obs.C if obs.C != -1 else None,
                'c': obs.c if obs.c != -1 else None,
                'EE': obs.EE,
                'H': obs.H if obs.H != -1 else None,
                'F': obs.F if obs.F != -1 else None,
                'V': obs.V if obs.V != -1 else None,
                'f': obs.f if obs.f != -1 else None,
                'zz': obs.zz if obs.zz not in (-1, 99) else (None if obs.zz == -1 else 99),
                'GG': obs.GG,
                'HO': obs.HO if obs.HO != -1 else None,
                'HU': obs.HU if obs.HU != -1 else None,
                'sectors': getattr(obs, 'sectors', ''),
                'remarks': getattr(obs, 'remarks', ''),
            }
            for obs in filtered_obs
        ],
        'count': len(filtered_obs)
    })


@api_blueprint.route('/monthly-stats', methods=['GET'])
def get_monthly_stats() -> Dict[str, Any]:
    """Generate monthly statistics (Monatsstatistik) for a specific month.
    
    Query parameters:
        mm: Month 1-12 (required)
        jj: Year 0-99 (required)
    
    Returns observer overview table with:
    - Days 1-31 as columns
    - Active observers as rows
    - Cell values: number of solar halo types, or 'X' for lunar only, or '_N' for both
    - Summary columns: total solar halos, days with solar, days with lunar, total days
    
    Note: Combined halo types (e.g., EE 04 = both 22° parhelia) are resolved to
    their individual components (EE 02 + EE 03) for statistical counting.
    """
    from flask import current_app
    from halo.models.constants import resolve_halo_type
    
    # Check if observations are loaded
    observations = current_app.config.get('OBSERVATIONS', [])
    observers = current_app.config.get('OBSERVERS', [])
    active_observers_only = bool(current_app.config.get('ACTIVE_OBSERVERS_ONLY', False))
    
    if not observations:
        return jsonify({'error': 'No observations loaded. Please load a file first.'}), 400
    
    mm = request.args.get('mm', '').strip()
    jj = request.args.get('jj', '').strip()
    
    if not all([mm, jj]):
        return jsonify({'error': 'Missing required parameters: mm, jj'}), 400
    
    try:
        mm_int = int(mm)
        jj_int = int(jj)
        
        if mm_int < 1 or mm_int > 12:
            return jsonify({'error': 'Invalid month (1-12)'}), 400
        if jj_int < 0 or jj_int > 99:
            return jsonify({'error': 'Invalid year (0-99)'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid numeric parameters'}), 400
    
    # Filter observations for this month
    filtered_obs = [obs for obs in observations 
                    if obs.MM == mm_int and obs.JJ == jj_int]
    
    # Get all active observers at the end of this month/year (SEIT <= MMJJ)
    # Build SEIT value for comparison using same formula as _parse_seit: mm + 13 * jj
    month_year_value = mm_int + 13 * jj_int
    
    # Get unique active observers up to this month/year
    active_observers = {}
    for obs_record in observers:
        kk = obs_record[0]  # Column 0: KK
        seit_str = obs_record[3]  # Column 3: seit (MM/JJ format)
        aktiv_str = obs_record[4]  # Column 4: aktiv (0 or 1)
        
        # Parse seit from "MM/JJ" to integer MMJJ
        seit = _parse_seit(seit_str) if seit_str else 0
        
        # Parse aktiv to integer
        try:
            aktiv = int(aktiv_str) if aktiv_str else 0
        except (ValueError, TypeError):
            aktiv = 0
        
        # Observer is active if:
        # 1. They started before or during this month (seit <= month_year_value)
        # 2. If active_observers_only is True, they must be marked as active (aktiv == 1)
        #    If active_observers_only is False, include all observers (matches Pascal: aktbeob<>'J')
        if seit <= month_year_value:
            if not active_observers_only or aktiv == 1:
                # Keep the most recent record for each KK
                if kk not in active_observers or seit > _parse_seit(active_observers[kk][3]):
                    active_observers[kk] = obs_record
    
    # Build observer overview table
    # Structure: observer_data[KK] = {
    #   'days': {1..31: {'solar_ee': set of EE, 'lunar': has_lunar}},
    #   'total_solar': count,
    #   'days_solar': count,
    #   'days_lunar': count,
    #   'total_days': count,
    #   'region': GG
    # }
    observer_data = {}
    
    # Initialize all active observers with empty data
    for kk, obs_record in active_observers.items():
        observer_data[kk] = {
            'days': {},
            'total_solar': 0,
            'days_solar': 0,
            'days_lunar': 0,
            'total_days': 0,
            'region': int(obs_record[6]) if obs_record[6] else 0  # Column 6: GH (home region)
        }
    
    # Process each observation to fill in observation data
    for obs in filtered_obs:
        kk = str(obs.KK).zfill(2)  # Ensure KK is string with leading zero (e.g., "06")
        tt = obs.TT
        o = obs.O  # 1=solar, 2=lunar
        ee = obs.EE  # Halo type
        
        # Only process observations from active observers (skip inactive observers' data)
        if kk not in observer_data:
            continue
        
        # Initialize day data if needed
        if tt not in observer_data[kk]['days']:
            observer_data[kk]['days'][tt] = {'solar_ee': set(), 'lunar': False}
        
        # Track unique solar halo types (O=1)
        # Combined halo types are resolved to individual components
        # Example: EE 04 (both 22° parhelia) → EE 02 + EE 03
        if o == 1:
            for individual_ee in resolve_halo_type(ee):
                observer_data[kk]['days'][tt]['solar_ee'].add(individual_ee)
        
        # Mark if lunar halos observed (O=2)
        if o == 2:
            observer_data[kk]['days'][tt]['lunar'] = True
    
    # Calculate summary statistics and determine predominant region per observer
    for kk in observer_data:
        days_with_solar = set()
        days_with_lunar = set()
        region_counts = {}
        total_unique_solar_ee = 0
        
        for tt in observer_data[kk]['days']:
            day_data = observer_data[kk]['days'][tt]
            
            # Count unique solar halo types for this day
            num_unique_ee = len(day_data['solar_ee'])
            if num_unique_ee > 0:
                days_with_solar.add(tt)
                total_unique_solar_ee += num_unique_ee
            
            if day_data['lunar']:
                days_with_lunar.add(tt)
        
        observer_data[kk]['total_solar'] = total_unique_solar_ee
        
        # Determine predominant region based on where most observations were made
        # Logic: Count observation days by site indicator (g)
        #   g=0: primary site (HbOrt) -> use GH from observer record
        #   g=1: other location -> display as // (region 39)
        #   g=2: secondary site (NbOrt) -> use GN from observer record
        obs_for_kk = [obs for obs in filtered_obs if str(obs.KK).zfill(2) == kk]
        
        # Track which days have observations at which site (g value)
        site_days = {0: set(), 1: set(), 2: set()}  # g -> set of days
        for obs in obs_for_kk:
            g = obs.g if hasattr(obs, 'g') and obs.g in [0, 1, 2] else 0
            site_days[g].add(obs.TT)
        
        # Find site (g value) with most observation days
        max_site = max(site_days.items(), key=lambda x: len(x[1]))
        predominant_g = max_site[0]
        
        # Determine region based on predominant site:
        if predominant_g == 1:
            # Most observations at "other" location -> display //
            predominant_region = 39
        elif predominant_g == 0:
            # Most observations at primary site -> use GH from observer record (column 6)
            predominant_region = int(active_observers[kk][6]) if active_observers[kk][6] else 39
        elif predominant_g == 2:
            # Most observations at secondary site -> use GN from observer record (column 14)
            predominant_region = int(active_observers[kk][14]) if active_observers[kk][14] else 39
        else:
            # Fallback
            predominant_region = int(active_observers[kk][6]) if active_observers[kk][6] else 39
        
        observer_data[kk]['region'] = predominant_region
        
        observer_data[kk]['days_solar'] = len(days_with_solar)
        observer_data[kk]['days_lunar'] = len(days_with_lunar)
        observer_data[kk]['total_days'] = len(set(list(days_with_solar) + list(days_with_lunar)))
    
    # Build observer list with all active observers (including those with no observations)
    # Sort by region then KK
    observer_list = []
    for kk, data in observer_data.items():
        # Convert solar_ee sets to counts for JSON serialization
        days_dict = {}
        for tt, day_data in data['days'].items():
            days_dict[tt] = {
                'solar': len(day_data['solar_ee']),  # Count unique EE values
                'lunar': day_data['lunar']
            }
        
        observer_list.append({
            'kk': kk,
            'region': data['region'],
            'days': days_dict,
            'total_solar': data['total_solar'],
            'days_solar': data['days_solar'],
            'days_lunar': data['days_lunar'],
            'total_days': data['total_days']
        })
    
    # Sort by region, then by KK
    observer_list.sort(key=lambda x: (x['region'], x['kk']))
    
    # Build EE overview table (Ergebnisübersicht Sonnenhalos)
    # Structure: ee_overview[EE] = {1..31: count_of_observers}
    # Count how many observers saw each halo type on each day
    # Note: Same observer seeing same EE multiple times on same day counts only once
    ee_overview = {}
    
    for obs in filtered_obs:
        if obs.O != 1:  # Only solar halos (O=1)
            continue
        
        kk = str(obs.KK).zfill(2)
        tt = obs.TT
        ee = obs.EE
        
        # Skip if observer not in active list
        if kk not in observer_data:
            continue
        
        # Resolve combined halo types to individual components
        for individual_ee in resolve_halo_type(ee):
            if individual_ee not in ee_overview:
                ee_overview[individual_ee] = {}
            
            if tt not in ee_overview[individual_ee]:
                ee_overview[individual_ee][tt] = set()
            
            # Add observer to set (ensures same observer counts only once per day)
            ee_overview[individual_ee][tt].add(kk)
    
    # Convert sets to counts and calculate totals
    # Filter to only show specific EE types: 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12
    allowed_ee_types = {1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12}
    
    ee_list = []
    for ee in sorted(ee_overview.keys()):
        # Skip EE types not in the allowed list
        if ee not in allowed_ee_types:
            continue
            
        days_dict = {}
        total_count = 0
        
        for tt in range(1, 32):  # Days 1-31
            if tt in ee_overview[ee]:
                count = len(ee_overview[ee][tt])
                days_dict[tt] = count
                total_count += count
            else:
                days_dict[tt] = 0
        
        ee_list.append({
            'ee': ee,
            'days': days_dict,
            'total': total_count
        })
    
    # Calculate daily totals (sum across allowed EE types only for each day)
    daily_totals = {}
    for tt in range(1, 32):
        daily_totals[tt] = sum(
            len(ee_overview[ee].get(tt, set())) 
            for ee in ee_overview
            if ee in allowed_ee_types
        )
    
    # Calculate grand total
    grand_total = sum(daily_totals.values())
    
    # Collect rare halos (EE > 12) for third table
    # Structure: rare_halos = [{tt, ee, kk, gg}, ...] sorted by day, then EE, then KK
    rare_halos = []
    
    for obs in filtered_obs:
        if obs.O != 1:  # Only solar halos (O=1)
            continue
        
        kk = str(obs.KK).zfill(2)
        
        # Skip if observer not in active list
        if kk not in observer_data:
            continue
        
        # Resolve combined halo types to check for rare halos
        for individual_ee in resolve_halo_type(obs.EE):
            if individual_ee > 12:
                # Use GG directly from observation record
                gg = obs.GG
                
                rare_halos.append({
                    'tt': obs.TT,
                    'ee': individual_ee,
                    'kk': kk,
                    'gg': str(gg).zfill(2) if gg != 39 else '//'
                })
    
    # Sort rare halos by day, then EE, then KK
    rare_halos.sort(key=lambda x: (x['tt'], x['ee'], x['kk']))
    
    # Calculate halo activity (real and relative)
    from halo.models.constants import calculate_halo_activity
    
    # Get all observations for the month (not just solar)
    activity_data = calculate_halo_activity(
        observations=filtered_obs,
        observers=active_observers,  # Pass the dict, not the raw list
        mm=mm_int,
        jj=jj_int,
        active_observers_only=active_observers_only
    )
    
    # Apply 30-day normalization (Pascal: aktf[i] * 30 / tprom[mm])
    # This ensures activity values are comparable across months of different lengths
    days_in_month = get_days_in_month(mm_int, jj_int)
    normalization_factor = 30.0 / days_in_month
    
    # Apply normalization to daily and total activity values
    normalized_real = {day: value * normalization_factor for day, value in activity_data['real'].items()}
    normalized_relative = {day: value * normalization_factor for day, value in activity_data['relative'].items()}
    normalized_total_real = activity_data['total_real'] * normalization_factor
    normalized_total_relative = activity_data['total_relative'] * normalization_factor
    
    return jsonify({
        'mm': mm_int,
        'jj': jj_int,
        'observer_overview': observer_list,
        'ee_overview': ee_list,
        'daily_totals': daily_totals,
        'grand_total': grand_total,
        'rare_halos': rare_halos,
        'activity_real': normalized_real,
        'activity_relative': normalized_relative,
        'activity_totals': {
            'real': normalized_total_real,
            'relative': normalized_total_relative
        },
        'activity_count': activity_data['active_count'],
        'activity_observation_count': activity_data['observation_count'],
        'count': len(filtered_obs)
    })


@api_blueprint.route('/annual-stats', methods=['GET'])
def get_annual_stats() -> Dict[str, Any]:
    """Get annual statistics for a given year.
    
    Query parameters:
        jj: Year (2-digit, 50-99 for 1950-2099)
    
    Returns:
        Dictionary with:
        - jj: Year
        - observer_overview: Observer statistics for the year
        - activity_real: Real activity per month (1-12)
        - activity_relative: Relative activity per month (1-12)
        - activity_totals: Total real and relative activity
        - activity_count: Number of active observers
    """
    from flask import current_app
    from halo.models.constants import calculate_halo_activity
    
    # Check if observations are loaded
    observations = current_app.config.get('OBSERVATIONS', [])
    observers = current_app.config.get('OBSERVERS', [])
    active_observers_only = bool(current_app.config.get('ACTIVE_OBSERVERS_ONLY', False))
    
    if not observations:
        return jsonify({'error': 'No observations loaded. Please load a file first.'}), 400
    
    jj = request.args.get('jj', '').strip()
    
    if not jj:
        return jsonify({'error': 'Missing required parameter: jj'}), 400
    
    try:
        jj_int = int(jj)
        
        if jj_int < 0 or jj_int > 99:
            return jsonify({'error': 'Invalid year (0-99)'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid numeric parameter'}), 400
    
    # Filter observations for this year (all months)
    filtered_obs = [obs for obs in observations if obs.JJ == jj_int]
    
    # Get all active observers up to end of year
    # Use December of the year as reference (month 12)
    month_year_value = 12 + 13 * jj_int
    
    # Get unique active observers up to this year
    active_observers = {}
    for obs_record in observers:
        kk = obs_record[0]  # Column 0: KK
        seit_str = obs_record[3]  # Column 3: seit (MM/JJ format)
        aktiv_str = obs_record[4]  # Column 4: aktiv (0 or 1)
        
        # Parse seit from "MM/JJ" to integer MMJJ
        seit = _parse_seit(seit_str) if seit_str else 0
        
        # Parse aktiv to integer
        try:
            aktiv = int(aktiv_str) if aktiv_str else 0
        except (ValueError, TypeError):
            aktiv = 0
        
        # Observer is active if:
        # 1. They started before or during this year (seit <= month_year_value)
        # 2. If active_observers_only is True, they must be marked as active (aktiv == 1)
        if seit <= month_year_value:
            if not active_observers_only or aktiv == 1:
                # Keep the most recent record for each KK
                if kk not in active_observers or seit > _parse_seit(active_observers[kk][3]):
                    active_observers[kk] = obs_record
    
    # Calculate statistics per month using deduplication algorithm
    # Prevents double counting: each observer (KK) can only count each halo type (EE) once per day
    # Only EE=4 (both 22° parhelia) splits into EE=2 + EE=3
    monthly_stats = {}
    
    # Track counts per individual EE type across all months
    sun_ee_counts = {}  # {ee: count}
    moon_ee_counts = {}  # {ee: count}
    
    for mm in range(1, 13):
        month_obs = [obs for obs in filtered_obs if obs.MM == mm]
        
        # Sort observations by day for efficient processing
        month_obs.sort(key=lambda o: (o.TT, o.KK, o.O, o.EE))
        
        # Track which (observer, object, halo_type) combinations have been counted each day
        # Key: (day, observer_KK, object_O, halo_EE) -> prevents double counting
        counted_today = set()
        last_day = -1
        
        sun_ee_count = 0
        moon_ee_count = 0
        sun_days_set = set()
        moon_days_set = set()
        total_days_set = set()
        
        for obs in month_obs:
            # Reset tracking when day changes
            if obs.TT != last_day:
                last_day = obs.TT
                counted_today = set()
            
            # Handle EE=4 (both 22° parhelia) - splits into EE=2 + EE=3
            halos_to_count = []
            if obs.EE == 4:
                # EE=4 splits into EE=2 (left parhelion) and EE=3 (right parhelion)
                # Check if EE=2 hasn't been counted yet
                if (obs.TT, obs.KK, obs.O, 2) not in counted_today:
                    halos_to_count.append(2)
                    counted_today.add((obs.TT, obs.KK, obs.O, 2))
                # Check if EE=3 hasn't been counted yet
                if (obs.TT, obs.KK, obs.O, 3) not in counted_today:
                    halos_to_count.append(3)
                    counted_today.add((obs.TT, obs.KK, obs.O, 3))
            else:
                # Normal halo type - check if not yet counted for this observer today
                if (obs.TT, obs.KK, obs.O, obs.EE) not in counted_today:
                    halos_to_count.append(obs.EE)
                    counted_today.add((obs.TT, obs.KK, obs.O, obs.EE))
            
            # Count only if this observation adds new halo types
            if halos_to_count:
                count_increment = len(halos_to_count)
                
                if obs.O == 1:
                    # Sun halos
                    sun_ee_count += count_increment
                    sun_days_set.add((obs.TT, obs.MM))
                    total_days_set.add((obs.TT, obs.MM))
                    # Track individual EE counts
                    for ee in halos_to_count:
                        sun_ee_counts[ee] = sun_ee_counts.get(ee, 0) + 1
                elif obs.O == 2:
                    # Moon halos
                    moon_ee_count += count_increment
                    moon_days_set.add((obs.TT, obs.MM))
                    total_days_set.add((obs.TT, obs.MM))
                    # Track individual EE counts
                    for ee in halos_to_count:
                        moon_ee_counts[ee] = moon_ee_counts.get(ee, 0) + 1
        
        sun_days = len(sun_days_set)
        moon_days = len(moon_days_set)
        total_days = len(total_days_set)
        total_ee_count = sun_ee_count + moon_ee_count
        
        # Get sun observations for activity calculation
        sun_obs = [obs for obs in month_obs if obs.O == 1]
        
        # Calculate activity
        activity_data = calculate_halo_activity(
            observations=sun_obs,  # Activity calculation typically based on sun observations
            observers=active_observers,
            mm=mm,
            jj=jj_int,
            active_observers_only=active_observers_only
        )
        
        # Apply 30-day normalization for this month (Pascal: aktf[mm] * 30 / tprom[mm])
        # This ensures activity values are comparable across months of different lengths
        days_in_month = get_days_in_month(mm, jj_int)
        normalization_factor = 30.0 / days_in_month
        normalized_real = activity_data['total_real'] * normalization_factor
        normalized_relative = activity_data['total_relative'] * normalization_factor
        
        # Use string keys for JSON serialization
        monthly_stats[str(mm)] = {
            'sun_ee': sun_ee_count,
            'sun_days': sun_days,
            'moon_ee': moon_ee_count,
            'moon_days': moon_days,
            'total_ee': total_ee_count,
            'total_days': total_days,
            'real': normalized_real,
            'relative': normalized_relative
        }
    
    # Calculate totals (using string keys)
    totals = {
        'sun_ee': sum(monthly_stats[str(mm)]['sun_ee'] for mm in range(1, 13)),
        'sun_days': sum(monthly_stats[str(mm)]['sun_days'] for mm in range(1, 13)),
        'moon_ee': sum(monthly_stats[str(mm)]['moon_ee'] for mm in range(1, 13)),
        'moon_days': sum(monthly_stats[str(mm)]['moon_days'] for mm in range(1, 13)),
        'total_ee': sum(monthly_stats[str(mm)]['total_ee'] for mm in range(1, 13)),
        'total_days': sum(monthly_stats[str(mm)]['total_days'] for mm in range(1, 13)),
        'real': sum(monthly_stats[str(mm)]['real'] for mm in range(1, 13)),
        'relative': sum(monthly_stats[str(mm)]['relative'] for mm in range(1, 13))
    }
    
    # Calculate per-observer EE distribution (EE 01, 02, 03, 05-07)
    # Track for each observer: counts of EE 01, 02, 03, 05, 06, 07 and total sun EE
    observer_stats = {}
    
    # First pass: initialize observer stats and count total days (sun + moon)
    for obs in filtered_obs:
        kk = obs.KK
        if kk not in observer_stats:
            observer_stats[kk] = {
                'ee01': 0, 'ee02': 0, 'ee03': 0, 'ee567': 0,
                'total_sun_ee': 0, 'sun_days': set(), 'total_days': set()
            }
        # Track all halo days (sun and moon) for total_days
        observer_stats[kk]['total_days'].add((obs.MM, obs.TT))
    
    # Now count sun halos with deduplication
    filtered_obs.sort(key=lambda o: (o.MM, o.TT, o.KK, o.O, o.EE))
    counted_per_observer = {}  # {kk: {(day, ee): counted}}
    
    for obs in filtered_obs:
        if obs.O != 1:  # Only sun halos for EE distribution
            continue
        
        kk = obs.KK
        if kk not in counted_per_observer:
            counted_per_observer[kk] = {}
        
        # Track per day for this observer (use month+day to make unique across year)
        day_key = (obs.MM, obs.TT)
        
        # Handle EE=4 splitting
        halos_to_count = []
        if obs.EE == 4:
            if (day_key, 2) not in counted_per_observer[kk]:
                halos_to_count.append(2)
                counted_per_observer[kk][(day_key, 2)] = True
            if (day_key, 3) not in counted_per_observer[kk]:
                halos_to_count.append(3)
                counted_per_observer[kk][(day_key, 3)] = True
        else:
            if (day_key, obs.EE) not in counted_per_observer[kk]:
                halos_to_count.append(obs.EE)
                counted_per_observer[kk][(day_key, obs.EE)] = True
        
        # Count for this observer
        for ee in halos_to_count:
            observer_stats[kk]['total_sun_ee'] += 1
            
            if ee == 1:
                observer_stats[kk]['ee01'] += 1
            elif ee == 2:
                observer_stats[kk]['ee02'] += 1
            elif ee == 3:
                observer_stats[kk]['ee03'] += 1
            elif ee in [5, 6, 7]:
                observer_stats[kk]['ee567'] += 1
        
        # Track sun halo days only
        if halos_to_count:
            observer_stats[kk]['sun_days'].add((obs.MM, obs.TT))
    
    # Convert sets to counts and calculate EE1-7
    observer_distribution = []
    for kk in sorted(observer_stats.keys()):
        stats = observer_stats[kk]
        ee17 = stats['ee01'] + stats['ee02'] + stats['ee03'] + stats['ee567']
        
        # Calculate percentages (relative to EE1-7)
        if ee17 > 0:
            pct01 = (stats['ee01'] / ee17) * 100.0
            pct02 = (stats['ee02'] / ee17) * 100.0
            pct03 = (stats['ee03'] / ee17) * 100.0
            pct567 = (stats['ee567'] / ee17) * 100.0
        else:
            pct01 = pct02 = pct03 = pct567 = 0.0
        
        observer_distribution.append({
            'kk': kk,
            'ee01': stats['ee01'],
            'pct01': pct01,
            'ee02': stats['ee02'],
            'pct02': pct02,
            'ee03': stats['ee03'],
            'pct03': pct03,
            'ee567': stats['ee567'],
            'pct567': pct567,
            'ee17': ee17,
            'total_sun_ee': stats['total_sun_ee'],
            'sun_days': len(stats['sun_days']),
            'total_days': len(stats['total_days'])
        })
    
    # Calculate phenomena (observations with '*' in remarks, 5+ EE types visible simultaneously)
    # Group by unique (MM, TT, KK, O) combination
    phenomena_dict = {}  # Key: (MM, TT, KK, O), Value: phenomenon data
    
    for obs in filtered_obs:
        # Check for '*' in remarks
        if not obs.remarks or '*' not in obs.remarks:
            continue
        
        # Group by (MM, TT, KK, O)
        key = (obs.MM, obs.TT, obs.KK, obs.O)
        if key not in phenomena_dict:
            phenomena_dict[key] = {
                'mm': obs.MM,
                'tt': obs.TT,
                'kk': obs.KK,
                'gg': obs.GG,
                'zs': obs.ZS,
                'zm': obs.ZM,
                'o': obs.O,
                'ee_types': set(),
                'ee_count': 0  # Track count of EE types
            }
        
        # Add EE type (split if EE=4) and update count
        ee_before = len(phenomena_dict[key]['ee_types'])
        if obs.EE == 4:
            phenomena_dict[key]['ee_types'].add(2)
            phenomena_dict[key]['ee_types'].add(3)
        else:
            phenomena_dict[key]['ee_types'].add(obs.EE)
        
        ee_after = len(phenomena_dict[key]['ee_types'])
        phenomena_dict[key]['ee_count'] = ee_after
        
        # Update time only if count < 6 (freeze time after 5th EE type confirmed)
        if ee_after < 6:
            phenomena_dict[key]['zs'] = obs.ZS
            phenomena_dict[key]['zm'] = obs.ZM
    
    # Convert to sorted list (sort by month, day, kk, then by time within same kk)
    phenomena_list = []
    for key in sorted(phenomena_dict.keys()):
        phenom = phenomena_dict[key]
        phenom['ee_types'] = sorted(list(phenom['ee_types']))
        phenomena_list.append(phenom)
    
    # Sort by (MM, TT, KK, time)
    phenomena_list.sort(key=lambda p: (p['mm'], p['tt'], p['kk'], p['zs'], p['zm']))
    
    return jsonify({
        'jj': jj_int,
        'monthly_stats': monthly_stats,
        'totals': totals,
        'observer_count': len(active_observers),
        'sun_ee_counts': sun_ee_counts,
        'moon_ee_counts': moon_ee_counts,
        'observer_distribution': observer_distribution,
        'phenomena': phenomena_list
    })


@api_blueprint.route('/observers', methods=['GET'])
def get_observers() -> Dict[str, Any]:
    """Get observer records with optional filtering.
    
    Query parameters:
        filter_type: 'none', 'kk', 'site', 'region'
        filter_value: Filter value (KK for kk, site name for site, region number for region)
        latest_only: 'true' to show only the latest site per observer (default), 'false' to show all
        kk: Observer code (for single observer lookup)
        jj: Year (2-digit) for observation date filtering
        mm: Month (1-12) for observation date filtering
    """
    from flask import current_app
    from datetime import datetime
    
    observers = current_app.config.get('OBSERVERS', [])
    filter_type = request.args.get('filter_type', 'none')
    filter_value = request.args.get('filter_value', '')
    latest_only = request.args.get('latest_only', 'true').lower() == 'true'
    
    # Special case: single observer lookup by KK with JJ/MM date filtering
    kk_param = request.args.get('kk', '').strip()
    jj_param = request.args.get('jj', '').strip()
    mm_param = request.args.get('mm', '').strip()
    
    if kk_param and jj_param and mm_param:
        try:
            jj = int(jj_param)
            mm = int(mm_param)
            # Calculate seit value for observation date: month + 13 × year
            obs_seit = mm + 13 * jj
            
            # Find all records for this observer
            kk_records = [obs for obs in observers if obs[0] == kk_param]
            
            if kk_records:
                # Find the latest record where seit <= observation date
                valid_records = [obs for obs in kk_records if obs[3] and _parse_seit(obs[3]) <= obs_seit]
                
                if valid_records:
                    # Get the record with the latest seit value
                    latest_record = max(valid_records, key=lambda obs: _parse_seit(obs[3]))
                    
                    # Return single observer with GH and GN
                    result = {
                        'KK': latest_record[0],
                        'VName': latest_record[1],
                        'NName': latest_record[2],
                        'seit': latest_record[3],
                        'aktiv': latest_record[4],
                        'HbOrt': latest_record[5],
                        'GH': latest_record[6],
                        'GN': latest_record[14]
                    }
                    return jsonify({'observer': result})
            
            # If no matching record found, return empty
            return jsonify({'observer': None})
        except (ValueError, IndexError) as e:
            return jsonify({'error': f'Invalid parameters: {e}'}), 400
    
    if filter_type == 'none':
        # Return all observers
        filtered = observers
    elif filter_type == 'kk':
        # Filter by observer ID (KK field is at index 0)
        filtered = [obs for obs in observers if len(obs) >= 21 and obs[0] == filter_value]
    elif filter_type == 'site':
        # Filter by observation site (HbOrt at index 5, NbOrt at index 13)
        search_term = filter_value.lower()
        filtered = [obs for obs in observers 
                   if len(obs) >= 21 and (search_term in obs[5].lower() or search_term in obs[13].lower())]
    elif filter_type == 'region':
        # Filter by geographic region (GH at index 6, GN at index 14)
        filtered = [obs for obs in observers 
                   if len(obs) >= 21 and (str(obs[6]) == filter_value or str(obs[14]) == filter_value)]
    else:
        filtered = [obs for obs in observers if len(obs) >= 21]
    
    # Filter to latest site only if requested
    if latest_only:
        # Group by KK and keep only the record with the latest 'seit' date
        latest_sites = {}
        for obs in filtered:
            # Skip entries that don't have enough columns
            if len(obs) < 21:
                continue
                
            kk = obs[0]
            seit = obs[3]  # seit field in MM/YY format
            
            # Parse seit (MM/YY) to compare dates
            try:
                month, year = map(int, seit.split('/'))
                # Convert to full year (assume 20xx for years < 50, 19xx otherwise)
                full_year = 2000 + year if year < 50 else 1900 + year
                date_key = (full_year, month)
                
                if kk not in latest_sites or date_key > latest_sites[kk][1]:
                    latest_sites[kk] = (obs, date_key)
            except (ValueError, AttributeError):
                # If date parsing fails, keep the record
                if kk not in latest_sites:
                    latest_sites[kk] = (obs, (0, 0))
        
        filtered = [obs_tuple[0] for obs_tuple in latest_sites.values()]
    
    # Convert to dict format for JSON
    result = []
    for obs in filtered:
        # Skip entries that don't have enough columns
        if len(obs) < 21:
            continue
            
        result.append({
            'KK': obs[0],
            'VName': obs[1],
            'NName': obs[2],
            'seit': obs[3],
            'aktiv': obs[4],
            'HbOrt': obs[5],
            'GH': obs[6],
            'HLG': obs[7],
            'HLM': obs[8],
            'HOW': obs[9],
            'HBG': obs[10],
            'HBM': obs[11],
            'HNS': obs[12],
            'NbOrt': obs[13],
            'GN': obs[14],
            'NLG': obs[15],
            'NLM': obs[16],
            'NOW': obs[17],
            'NBG': obs[18],
            'NBM': obs[19],
            'NNS': obs[20]
        })
    
    return jsonify({'observers': result, 'count': len(result)})


@api_blueprint.route('/observers/list', methods=['GET'])
def get_observers_list() -> Dict[str, Any]:
    """Get list of unique observers (KK + Name) for dropdown."""
    from flask import current_app
    
    observers = current_app.config.get('OBSERVERS', [])
    print(f"DEBUG: /api/observers/list called - total observers in config: {len(observers)}")
    
    # Get unique observers by KK
    unique_observers = {}
    for obs in observers:
        # Skip entries that don't have enough columns
        if len(obs) < 21:
            continue
            
        kk = obs[0]
        vname = obs[1] if len(obs) > 1 and obs[1] else ''
        nname = obs[2] if len(obs) > 2 and obs[2] else ''
        
        # Skip if KK is empty or both names are empty
        if not kk or (not vname and not nname):
            continue
            
        if kk not in unique_observers:
            unique_observers[kk] = {
                'KK': kk,
                'VName': vname,
                'NName': nname
            }
    
    print(f"DEBUG: Returning {len(unique_observers)} unique observers")
    # Convert to list and sort by KK
    observer_list = sorted(unique_observers.values(), key=lambda x: x['KK'])
    
    return jsonify({'observers': observer_list})


def _parse_seit(seit_str: str) -> int:
    """Parse 'seit' field from MM/YY format to seit value (month + 13 × year).
    
    Args:
        seit_str: String in format 'MM/YY' (e.g., '01/86', '12/05')
    
    Returns:
        seit value as integer (month + 13 × year)
        
    Note:
        Years 00-49 are treated as 2000-2049 (add 100 to year for formula)
        Years 50-99 are treated as 1950-1999 (use year as-is)
    """
    try:
        parts = seit_str.split('/')
        if len(parts) == 2:
            month = int(parts[0])
            year = int(parts[1])
            
            # Handle century boundary: years 00-49 are 2000+, so add 100 to year
            if year < 50:
                year += 100
            
            return month + 13 * year
    except (ValueError, AttributeError):
        pass
    return 0


@api_blueprint.route('/observers/regions', methods=['GET'])
def get_observer_regions() -> Dict[str, Any]:
    """Get list of unique geographic regions for dropdown."""
    from flask import current_app
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Get unique regions
    regions = set()
    for obs in observers:
        # Skip entries that don't have enough columns
        if len(obs) < 21:
            continue
        regions.add(int(obs[6]))  # GH - primary region
        regions.add(int(obs[14]))  # GN - secondary region
    
    # Sort and create list with region numbers
    # TODO: Add region names from a lookup table
    region_list = [{'number': r, 'name': f'Region {r}'} for r in sorted(regions)]
    
    return jsonify({'regions': region_list})


@api_blueprint.route('/observers', methods=['POST'])
def add_observer() -> Dict[str, Any]:
    """Add a new observer to halobeo.csv.
    
    Expected JSON payload:
        KK: Observer code (01-99)
        VName: First name (max 15 chars)
        NName: Last name (max 15 chars)
        seit_month: Month (1-12)
        seit_year: Year (2-digit or 4-digit)
        active: 1 for active, 0 for inactive
        HbOrt: Main observation site name (max 20 chars)
        GH: Main site geographic region (1-39)
        HLG: Main site longitude degrees
        HLM: Main site longitude minutes
        HOW: Main site longitude hemisphere (O/W)
        HBG: Main site latitude degrees
        HBM: Main site latitude minutes
        HNS: Main site latitude hemisphere (N/S)
        NbOrt: Secondary observation site name (max 20 chars)
        GN: Secondary site geographic region (1-39)
        NLG: Secondary site longitude degrees
        NLM: Secondary site longitude minutes
        NOW: Secondary site longitude hemisphere (O/W)
        NBG: Secondary site latitude degrees
        NBM: Secondary site latitude minutes
        NNS: Secondary site latitude hemisphere (N/S)
    """
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ['KK', 'VName', 'NName', 'seit_month', 'seit_year', 'active']
    for field in required_fields:
        if field not in data or data[field] == '':
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate KK format (must be 2-digit string between 01 and 99)
    kk = str(data['KK']).zfill(2)
    try:
        kk_int = int(kk)
        if kk_int < 1 or kk_int > 99:
            return jsonify({'error': 'KK must be between 01 and 99'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid KK format'}), 400
    
    # Check if KK already exists (don't allow any duplicate KK at all)
    observers = current_app.config.get('OBSERVERS', [])
    seit_str = f"{int(data['seit_month']):02d}/{int(data['seit_year']) % 100:02d}"
    
    # Check if this KK already exists (any observer with this KK)
    for obs in observers:
        if obs[0] == kk:
            return jsonify({'error': f'Observer code {kk} already exists'}), 400
    
    # Build the CSV row
    # Format: KK,VName,NName,seit,active,HbOrt,GH,HLG,HLM,HOW,HBG,HBM,HNS,NbOrt,GN,NLG,NLM,NOW,NBG,NBM,NNS
    new_row = [
        kk,
        data.get('VName', '')[:15],  # Max 15 chars
        data.get('NName', '')[:15],  # Max 15 chars
        seit_str,
        str(data.get('active', 1)),
        data.get('HbOrt', '')[:20],  # Max 20 chars
        str(data.get('GH', 0)),
        str(data.get('HLG', 0)),
        str(data.get('HLM', 0)),
        data.get('HOW', 'O'),
        str(data.get('HBG', 0)),
        str(data.get('HBM', 0)),
        data.get('HNS', 'N'),
        data.get('NbOrt', '')[:20],  # Max 20 chars
        str(data.get('GN', 0)),
        str(data.get('NLG', 0)),
        str(data.get('NLM', 0)),
        data.get('NOW', 'O'),
        str(data.get('NBG', 0)),
        str(data.get('NBM', 0)),
        data.get('NNS', 'N')
    ]
    
    # Insert in sorted position (by KK, then by seit)
    root_path = Path(__file__).parent.parent.parent.parent
    halobeo_path = root_path / 'resources' / 'halobeo.csv'
    
    try:
        # Add to in-memory list and sort
        observers.append(new_row)
        
        # Sort by KK (column 0), then by seit (column 3)
        def sort_key(obs):
            kk = obs[0]
            seit_str = obs[3]  # Format: MM/YY
            # Parse seit to numeric value for sorting
            try:
                parts = seit_str.split('/')
                month = int(parts[0])
                year = int(parts[1])
                seit_val = year * 100 + month  # YYMM for sorting
            except:
                seit_val = 0
            return (kk, seit_val)
        
        observers.sort(key=sort_key)
        current_app.config['OBSERVERS'] = observers
        
        # Rewrite entire file with sorted data
        with open(halobeo_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(observers)
        
        return jsonify({
            'success': True,
            'message': 'Observer added successfully',
            'observer': {
                'KK': kk,
                'VName': new_row[1],
                'NName': new_row[2],
                'seit': seit_str
            }
        })
    except Exception as e:
        return jsonify({'error': f'Failed to save observer: {str(e)}'}), 500


@api_blueprint.route('/observers/<kk>', methods=['PUT'])
def update_observer(kk: str) -> Dict[str, Any]:
    """Update observer base data (VName and NName only) in halobeo.csv and all observations in haloobs.csv.
    
    Args:
        kk: Observer code (01-99)
        
    Expected JSON payload:
        VName: First name (max 15 chars)
        NName: Last name (max 15 chars)
        
    Note: seit and active are bound to observation sites and cannot be changed here.
    """
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    data = request.get_json() or {}
    
    # Normalize KK to 2 digits
    kk = str(kk).zfill(2)
    
    # Validate required fields (only VName and NName are editable in base data)
    required_fields = ['VName', 'NName']
    for field in required_fields:
        if field not in data or data[field] == '':
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Find all observer entries in halobeo.csv with this KK
    observers = current_app.config.get('OBSERVERS', [])
    observer_indices = []
    for idx, obs in enumerate(observers):
        if obs[0] == kk:
            observer_indices.append(idx)
    
    if not observer_indices:
        return jsonify({'error': f'Observer {kk} not found'}), 404
    
    # Update VName and NName for all entries with this KK
    updated_count = 0
    for idx in observer_indices:
        old_observer = observers[idx]
        # Keep all data unchanged except VName and NName
        observers[idx] = [
            kk,  # KK (unchanged)
            data.get('VName', '')[:15],  # VName (updated)
            data.get('NName', '')[:15],  # NName (updated)
            old_observer[3],  # seit (unchanged)
            old_observer[4],  # active (unchanged)
            old_observer[5],  # HbOrt (unchanged)
            old_observer[6],  # GH (unchanged)
            old_observer[7],  # HLG (unchanged)
            old_observer[8],  # HLM (unchanged)
            old_observer[9],  # HOW (unchanged)
            old_observer[10],  # HBG (unchanged)
            old_observer[11],  # HBM (unchanged)
            old_observer[12],  # HNS (unchanged)
            old_observer[13],  # NbOrt (unchanged)
            old_observer[14],  # GN (unchanged)
            old_observer[15],  # NLG (unchanged)
            old_observer[16],  # NLM (unchanged)
            old_observer[17],  # NOW (unchanged)
            old_observer[18],  # NBG (unchanged)
            old_observer[19],  # NBM (unchanged)
            old_observer[20]   # NNS (unchanged)
        ]
        updated_count += 1
    
    # Get the first updated entry for response
    first_updated = observers[observer_indices[0]]
    
    root_path = Path(__file__).parent.parent.parent.parent
    halobeo_path = root_path / 'resources' / 'halobeo.csv'
    
    try:
        # Write updated observers to CSV
        print(f"DEBUG: Writing to: {halobeo_path}")
        print(f"DEBUG: Updated {updated_count} entries for KK {kk}: VName={first_updated[1]}, NName={first_updated[2]}")
        with open(halobeo_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(observers)
        print(f"DEBUG: Successfully wrote {len(observers)} observers to CSV")
        
        # Update config with modified list
        current_app.config['OBSERVERS'] = observers
        
        # Update metadata in observation files (if loaded)
        observations = current_app.config.get('OBSERVATIONS', [])
        if observations:
            obs_updated_count = 0
            for obs in observations:
                # Observation format: KK,VName,NName,Object,Year,Month,Day,Location,...
                if obs[0] == kk:
                    obs[1] = first_updated[1]  # Update VName
                    obs[2] = first_updated[2]  # Update NName
                    obs_updated_count += 1
            
            # Save updated observations back to haloobs.csv (if any were updated)
            if obs_updated_count > 0:
                haloobs_path = root_path / 'resources' / 'haloobs.csv'
                with open(haloobs_path, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerows(observations)
                current_app.config['OBSERVATIONS'] = observations
        
        return jsonify({
            'success': True,
            'message': f'Observer {kk} updated successfully ({updated_count} entries)',
            'observer': {
                'KK': kk,
                'VName': first_updated[1],
                'NName': first_updated[2],
                'seit': first_updated[3],
                'active': int(first_updated[4])
            }
        })
    except Exception as e:
        return jsonify({'error': f'Failed to update observer: {str(e)}'}), 500


@api_blueprint.route('/observers/<kk>/sites', methods=['GET'])
def get_observer_sites(kk):
    """Get all observation site entries for an observer"""
    from flask import current_app
    
    # Normalize KK to 2 digits
    kk = str(kk).zfill(2)
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Find all entries for this observer
    # Observers are lists: [KK,VName,NName,seit,active,HbOrt,GH,HLG,HLM,HOW,HBG,HBM,HNS,NbOrt,GN,NLG,NLM,NOW,NBG,NBM,NNS]
    # Indices: 0=KK, 1=VName, 2=NName, 3=seit, 4=active, 5=H_Ort, 6=H_GG, 7=H_LaenGrad, 8=H_LaenMin, 
    #          9=H_EW, 10=H_BreiGrad, 11=H_BreiMin, 12=H_NS, 13=N_Ort, 14=N_GG, 15=N_LaenGrad, 
    #          16=N_LaenMin, 17=N_EW, 18=N_BreiGrad, 19=N_BreiMin, 20=N_NS
    sites = []
    for obs in observers:
        if obs[0] == kk:  # obs[0] is KK
            # Parse seit to month/year
            seit_parts = obs[3].split('/')
            seit_month = int(seit_parts[0])
            seit_year = int(seit_parts[1])
            
            sites.append({
                'KK': obs[0],
                'VName': obs[1],
                'NName': obs[2],
                'seit': obs[3],
                'seit_month': seit_month,
                'seit_year': seit_year,
                'active': int(obs[4]),
                'HbOrt': obs[5],
                'GH': obs[6],
                'HLG': int(obs[7]) if obs[7] else 0,
                'HLM': int(obs[8]) if obs[8] else 0,
                'HOW': obs[9],
                'HBG': int(obs[10]) if obs[10] else 0,
                'HBM': int(obs[11]) if obs[11] else 0,
                'HNS': obs[12],
                'NbOrt': obs[13],
                'GN': obs[14],
                'NLG': int(obs[15]) if obs[15] else 0,
                'NLM': int(obs[16]) if obs[16] else 0,
                'NOW': obs[17],
                'NBG': int(obs[18]) if obs[18] else 0,
                'NBM': int(obs[19]) if obs[19] else 0,
                'NNS': obs[20]
            })
    
    if not sites:
        return jsonify({'error': 'Observer not found'}), 404
    
    return jsonify({'sites': sites})


@api_blueprint.route('/observers/<kk>/sites', methods=['POST'])
def add_observer_site(kk):
    """Add a new observation site entry for an observer"""
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    data = request.get_json() or {}
    
    # Normalize KK to 2 digits
    kk = str(kk).zfill(2)
    
    # Validate required fields
    required_fields = ['seit_month', 'seit_year', 'active', 'HbOrt', 'HBG', 'HBM', 
                       'HNS', 'HLG', 'HLM', 'HOW', 'GH']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Convert seit_month/seit_year to seit format (MM/YY)
    seit = f"{int(data['seit_month']):02d}/{int(data['seit_year']) % 100:02d}"
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Find an existing entry for this observer to get VName/NName
    # Observers are stored as lists: [KK, VName, NName, seit, active, ...]
    existing = None
    for obs in observers:
        if obs[0] == kk:  # obs[0] is KK
            existing = obs
            break
    
    if not existing:
        return jsonify({'error': 'Observer not found'}), 404
    
    # Check if entry with this seit already exists
    for obs in observers:
        if obs[0] == kk and obs[3] == seit:  # obs[0]=KK, obs[3]=seit
            return jsonify({'error': 'Entry with this date already exists'}), 400
    
    # Create new CSV row
    # Format: KK,VName,NName,seit,active,HbOrt,GH,HLG,HLM,HOW,HBG,HBM,HNS,NbOrt,GN,NLG,NLM,NOW,NBG,NBM,NNS
    new_row = [
        kk,                                      # 0: KK
        existing[1],                             # 1: VName
        existing[2],                             # 2: NName
        seit,                                    # 3: seit
        str(data['active']),                     # 4: active
        data['HbOrt'],                           # 5: HbOrt (H_Ort)
        data['GH'],                              # 6: GH (H_GG)
        str(data['HLG']),                        # 7: HLG (H_LaenGrad)
        str(data['HLM']),                        # 8: HLM (H_LaenMin)
        data['HOW'],                             # 9: HOW (H_EW)
        str(data['HBG']),                        # 10: HBG (H_BreiGrad)
        str(data['HBM']),                        # 11: HBM (H_BreiMin)
        data['HNS'],                             # 12: HNS (H_NS)
        data.get('NbOrt', ''),                   # 13: NbOrt (N_Ort)
        data.get('GN', ''),                      # 14: GN (N_GG)
        str(data.get('NLG', 0)),                 # 15: NLG (N_LaenGrad)
        str(data.get('NLM', 0)),                 # 16: NLM (N_LaenMin)
        data.get('NOW', ''),                     # 17: NOW (N_EW)
        str(data.get('NBG', 0)),                 # 18: NBG (N_BreiGrad)
        str(data.get('NBM', 0)),                 # 19: NBM (N_BreiMin)
        data.get('NNS', '')                      # 20: NNS (N_NS)
    ]
    
    # Add to list
    observers.append(new_row)
    
    # Sort observers by KK, then by seit (convert MM/YY to YYMM for proper sorting)
    def sort_key(obs):
        kk_val = obs[0]  # obs[0] is KK
        seit = obs[3]    # obs[3] is seit
        if seit and '/' in seit:
            parts = seit.split('/')
            if len(parts) == 2:
                month = int(parts[0])
                year = int(parts[1])
                # Convert to full year: years < 50 are 20xx, years >= 50 are 19xx
                full_year = 2000 + year if year < 50 else 1900 + year
                # Create sortable value: YYYYMM
                return (kk_val, full_year * 100 + month)
        return (kk_val, 0)
    
    observers.sort(key=sort_key)
    
    # Write to CSV
    try:
        root_path = Path(__file__).parent.parent.parent.parent
        csv_path = root_path / 'resources' / 'halobeo.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(observers)
        
        current_app.config['OBSERVERS'] = observers
        
        return jsonify({
            'success': True,
            'message': 'Site added successfully',
            'site': {
                'KK': new_row[0],
                'seit': new_row[3],
                'active': int(new_row[4])
            }
        })
    except Exception as e:
        return jsonify({'error': f'Failed to add site: {str(e)}'}), 500


@api_blueprint.route('/observers/<kk>/sites', methods=['PUT'])
def update_observer_site(kk):
    """Update an observation site entry for an observer"""
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    # Normalize KK to 2 digits
    kk = str(kk).zfill(2)
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Get originalSeit from request body
    seit = data.get('originalSeit')
    if not seit:
        return jsonify({'error': 'Original seit parameter required'}), 400
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Find the entry to update
    entry_found = False
    updated_observers = []
    
    for obs in observers:
        if obs[0] == kk and obs[3] == seit:  # obs[0]=KK, obs[3]=seit
            entry_found = True
            # Create new seit value from updated data
            new_seit = f"{str(data['seit_month']).zfill(2)}/{str(data['seit_year']).zfill(2)}"
            
            # Build updated row
            updated_row = [
                kk,  # 0: KK
                data.get('VName', obs[1] if len(obs) > 1 else ''),  # 1: VName
                data.get('NName', obs[2] if len(obs) > 2 else ''),  # 2: NName
                new_seit,  # 3: seit
                str(data.get('active', 1)),  # 4: active
                data.get('HbOrt', ''),  # 5: HbOrt
                data.get('GH', ''),  # 6: GH
                str(data.get('HLG', 0)),  # 7: HLG
                str(data.get('HLM', 0)),  # 8: HLM
                data.get('HOW', 'O'),  # 9: HOW
                str(data.get('HBG', 0)),  # 10: HBG
                str(data.get('HBM', 0)),  # 11: HBM
                data.get('HNS', 'N'),  # 12: HNS
                data.get('NbOrt', ''),  # 13: NbOrt
                data.get('GN', ''),  # 14: GN
                str(data.get('NLG', 0)),  # 15: NLG
                str(data.get('NLM', 0)),  # 16: NLM
                data.get('NOW', 'O'),  # 17: NOW
                str(data.get('NBG', 0)),  # 18: NBG
                str(data.get('NBM', 0)),  # 19: NBM
                data.get('NNS', 'N')  # 20: NNS
            ]
            updated_observers.append(updated_row)
        else:
            updated_observers.append(obs)
    
    if not entry_found:
        return jsonify({'error': 'Site entry not found'}), 404
    
    # Sort by KK and then by date
    def sort_key(obs):
        kk_val = obs[0]
        seit_parts = obs[3].split('/')
        month = int(seit_parts[0])
        year = int(seit_parts[1])
        full_year = 2000 + year if year < 50 else 1900 + year
        return (kk_val, full_year * 100 + month)
    
    updated_observers.sort(key=sort_key)
    
    # Write back to CSV
    try:
        # Use __file__ to get correct project root path
        root_path = Path(__file__).parent.parent.parent.parent
        csv_path = root_path / 'resources' / 'halobeo.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(updated_observers)
        
        # Update in-memory cache
        current_app.config['OBSERVERS'] = updated_observers
        
        return jsonify({
            'success': True,
            'message': 'Site updated successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to update site: {str(e)}'}), 500


@api_blueprint.route('/observers/<kk>/sites', methods=['DELETE'])
def delete_observer_site(kk):
    """Delete an observation site entry for an observer"""
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    # Normalize KK to 2 digits
    kk = str(kk).zfill(2)
    
    # Get seit from request body
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    seit = data.get('seit')
    if not seit:
        return jsonify({'error': 'seit parameter required'}), 400
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Count how many entries exist for this observer
    observer_entries = [obs for obs in observers if obs[0] == kk]  # obs[0] is KK
    
    if len(observer_entries) <= 1:
        return jsonify({'error': 'Cannot delete the last site entry'}), 400
    
    # Find and remove the entry
    entry_found = False
    new_observers = []
    for obs in observers:
        if obs[0] == kk and obs[3] == seit:  # obs[0]=KK, obs[3]=seit
            entry_found = True
            continue
        new_observers.append(obs)
    
    if not entry_found:
        return jsonify({'error': 'Site entry not found'}), 404
    
    # Write to CSV
    try:
        root_path = Path(__file__).parent.parent.parent.parent
        csv_path = root_path / 'resources' / 'halobeo.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(new_observers)
        
        current_app.config['OBSERVERS'] = new_observers
        
        return jsonify({
            'success': True,
            'message': 'Site deleted successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to delete site: {str(e)}'}), 500


@api_blueprint.route('/observers', methods=['DELETE'])
def delete_observer():
    """Delete all site entries for an observer"""
    from flask import current_app, request
    from pathlib import Path
    import csv
    
    # Get KK from request body
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    kk = data.get('KK')
    if not kk:
        return jsonify({'error': 'KK parameter required'}), 400
    
    # Normalize KK to 2 digits
    kk = str(kk).zfill(2)
    
    observers = current_app.config.get('OBSERVERS', [])
    
    # Find all entries for this observer
    observer_entries = [obs for obs in observers if obs[0] == kk]
    
    if not observer_entries:
        return jsonify({'error': 'Observer not found'}), 404
    
    # Remove all entries for this observer
    new_observers = [obs for obs in observers if obs[0] != kk]
    
    # Write to CSV
    try:
        root_path = Path(__file__).parent.parent.parent.parent
        csv_path = root_path / 'resources' / 'halobeo.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(new_observers)
        
        current_app.config['OBSERVERS'] = new_observers
        
        return jsonify({
            'success': True,
            'message': f'Observer {kk} deleted successfully',
            'deleted_count': len(observer_entries)
        })
    except Exception as e:
        return jsonify({'error': f'Failed to delete observer: {str(e)}'}), 500
