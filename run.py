"""Entry point for running HALO web application."""
import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / 'src'
sys.path.insert(0, str(src_path))

from halo.web.app import main

if __name__ == '__main__':
    main()
