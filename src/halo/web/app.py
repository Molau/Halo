"""
Flask application factory for HALO web application.
"""

from flask import Flask, render_template, session, request, g
from flask_cors import CORS
from pathlib import Path
from halo.services.settings import Settings


def create_app(config=None):
    """
    Create and configure Flask application.
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        Configured Flask application
    """
    # Define paths
    root_path = Path(__file__).parent.parent.parent.parent
    template_folder = root_path / 'templates'
    static_folder = root_path / 'static'
    
    # Create Flask app
    app = Flask(
        __name__,
        template_folder=str(template_folder),
        static_folder=str(static_folder)
    )
    
    # Load configuration
    app.config.update({
        'SECRET_KEY': 'dev-secret-key-change-in-production',
        'JSON_AS_ASCII': False,  # Support Unicode characters (umlauts)
        'INPUT_MODE': 'N',  # Default: N=Number entry, M=Menu entry
        'OUTPUT_MODE': 'P',  # Default: P=Pseudografik, H=HTML-Tabellen
        'DATE_DEFAULT_MODE': 'none',  # Default: none, current, previous, constant
        'DATE_DEFAULT_MONTH': 1,  # Month for constant mode
        'DATE_DEFAULT_YEAR': 2026,  # Year for constant mode
        'LOADED_FILE': None,
        'OBSERVATIONS': [],
        'OBSERVERS': [],  # Observer metadata from halobeo.csv
        'ACTIVE_OBSERVERS_ONLY': False,  # Setting: filter to active observers only
        'DIRTY': False,  # Track unsaved changes
        'UPDATE_REPO': '',  # e.g., 'owner/HALOpy'; leave empty to disable
    })
    
    if config:
        app.config.update(config)
    
    # Load persisted settings from halo.cfg (CSV)
    Settings.load_into(app.config, root_path)
    
    # Load startup file if configured
    startup_enabled = app.config.get('STARTUP_FILE_ENABLED', False)
    startup_file = app.config.get('STARTUP_FILE_PATH', '')
    
    if startup_enabled and startup_file:
        data_path = root_path / 'data' / startup_file
        if data_path.exists():
            try:
                # Import here to avoid circular imports
                from halo.io.csv_handler import ObservationCSV
                observations = ObservationCSV.read_observations(data_path)
                app.config['OBSERVATIONS'] = observations
                app.config['LOADED_FILE'] = startup_file
                app.config['DIRTY'] = False
                app.config['AUTO_LOADED'] = True  # Flag for showing notification
            except Exception as e:
                pass
        else:
            pass

    # Load observer metadata from resources/halobeo.csv
    observers_file = root_path / 'resources' / 'halobeo.csv'
    if observers_file.exists():
        import csv
        with open(observers_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            app.config['OBSERVERS'] = list(reader)
    else:
        pass
    
    # Enable CORS for API endpoints
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize i18n
    from halo.resources import get_current_language, get_i18n
    
    @app.before_request
    def setup_language():
        """Set up language for each request."""
        # Initialize session language if not set
        if 'language' not in session:
            # Try to detect from browser
            browser_lang = request.accept_languages.best_match(['de', 'en'])
            session['language'] = browser_lang or 'de'
        
        # Store current language in g for easy template access
        g.language = session.get('language', 'de')
        g.i18n = get_i18n(g.language)
    
    @app.context_processor
    def inject_i18n():
        """Make i18n functions available in all templates."""
        from halo.resources import get_string, get_language
        import time
        return {
            '_': get_string,  # Translation function (like gettext)
            'lang': get_language,  # Current language
            'i18n': g.i18n if hasattr(g, 'i18n') else get_i18n(),
            'static_version': int(time.time()),  # Cache-busting timestamp
            'update_repo': app.config.get('UPDATE_REPO', '')
        }
    
    # Register API blueprints
    from halo.api import api_blueprint
    from halo.api.update import update_blueprint
    app.register_blueprint(api_blueprint)
    app.register_blueprint(update_blueprint)
    
    # Web routes
    @app.route('/')
    def index():
        """Main page."""
        return render_template('index.html')
    
    @app.after_request
    def add_header(response):
        """Add headers to prevent caching of static files in development."""
        if app.debug:
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '-1'
        return response
    
    @app.route('/observations')
    def observations():
        """Observations browser page."""
        return render_template('observations.html')
    
    @app.route('/observers')
    def observers():
        """Observers browser page."""
        return render_template('observers.html')
    
    @app.route('/monthly-report')
    def monthly_report():
        """Monthly report (Monatsmeldung) page."""
        return render_template('monthly_report.html')
    
    @app.route('/monthly-stats')
    def monthly_stats():
        """Monthly statistics (Monatsstatistik) page."""
        return render_template('monthly_stats.html')
    
    @app.route('/annual-stats')
    def annual_stats():
        """Annual statistics (Jahresstatistik) page."""
        return render_template('annual_stats.html')
    
    @app.route('/analysis')
    def analysis():
        """Analysis (Auswertung) page."""
        return render_template('analysis.html')
    
    @app.route('/statistics')
    def statistics():
        """Statistics and analysis page."""
        return render_template('statistics.html')
    
    @app.route('/about')
    def about():
        """About page."""
        return render_template('about.html')
    
    return app


def main():
    """Run development server."""
    app = create_app()
    print("=" * 60)
    print("HALO Web Application")
    print("=" * 60)
    print("Starting development server...")
    print("Open your browser at: http://localhost:5000")
    print("Press Ctrl+C to stop")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)


if __name__ == '__main__':
    main()
