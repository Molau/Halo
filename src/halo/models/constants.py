"""
Constants and configuration values
Translated from H_TYPES.PAS
"""

# Maximum values
MAX_OBSERVERS = 160  # MaxKenn
MAX_HALO_TYPES = 99  # MaxEE is 77, but Haloartfaktor has 99 entries
MAX_REGIONS = 39  # Based on Zeitzone array (38 entries, 1-indexed)
MAX_LOCATIONS = 40  # MaxOrte

# Special characters
FF = chr(12)  # Form feed
ENTER = chr(13)
ESC = chr(27)
CRLF = chr(13) + chr(10)
LONG_BEEP = chr(7)

# Halo types that can have sectors (circular halos)
SECTOR_HALO_TYPES = {1, 7, 12, 31, 32, 33, 34, 35, 36, 40}

# German regions (indices)
GERMANY_REGIONS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}

# German regions + neighbors
GERMANY_WITH_NEIGHBORS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 21, 26, 27, 29, 32}

# Halo types that can be partial
PARTIAL_HALO_TYPES = {2, 3, 8, 9, 14, 15, 18, 19, 24, 25, 41, 42, 45, 46, 48, 49, 53, 54, 74, 75}

# Additional halo types
ADDITIONAL_HALO_TYPES = {4, 10, 16, 20, 26, 43, 47, 50, 55, 76}

# Cirrus types that can be partial
PARTIAL_CIRRUS_TYPES = {1, 2, 3}

# Days per month [regular, leap year]
DAYS_PER_MONTH = [
    (31, 31), (28, 29), (31, 31), (30, 30), (31, 31), (30, 30),
    (31, 31), (31, 31), (30, 30), (31, 31), (30, 30), (31, 31)
]

# Binary powers (for bit operations)
BINARY_POWERS = [1, 2, 4, 8, 16, 32, 64, 128]

# Timezone offsets for regions (hours from GMT/UTC)
TIMEZONE_OFFSETS = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  # 1-18
    2, 10,  # 19-20
    0, 0, 1, 1,  # 21-24
    0, 0, 0, 0, 0,  # 25-29
    -1,  # 30
    0, 0, 0,  # 31-33
    1,  # 34
    -1,  # 35
    0,  # 36
    -8,  # 37
    9  # 38
]

# Halo type weighting factors (for statistical calculations)
# Index 0 is unused, indices 1-99 correspond to halo types 1-99
HALO_TYPE_FACTORS = [
    0,  # Index 0 (unused)
    1, 2, 2, 4, 3, 3, 3, 5, 20, 25,  # 1-10
    8, 20, 20, 50, 50, 100, 75, 50, 50, 100,  # 11-20
    20, 75, 75, 100, 100, 100, 50, 100, 100, 100,  # 21-30
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100,  # 31-40
    100, 100, 100, 0, 0, 0, 0, 100, 100, 100,  # 41-50
    50, 100, 100, 100, 100, 100, 100, 100, 100, 100,  # 51-60
    100, 100, 100, 100, 100, 100, 100, 100, 100, 100,  # 61-70
    100, 100, 100, 100, 100, 100, 100, 0, 0, 0,  # 71-80
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  # 81-90
    0, 0, 0, 0, 0, 0, 0, 0, 0  # 91-99
]

# Halo brightness weighting factors
# -1: very faint, 0: faint, 1: medium, 2: bright, 3: very bright
HALO_BRIGHTNESS_FACTORS = {
    -1: 1.0,
    0: 0.8,
    1: 1.0,
    2: 1.2,
    3: 1.4
}

# Color scheme constants (for potential GUI color configuration)
# These were for the text-mode interface, may be adapted for GUI
COLOR_SCHEME = {
    'background': 'blue',
    'line': 'white',
    'pixel': 'lightcyan',
    'bar': 'red',
    'sum': 'lightred',
    'window1': 'cyan',
    'window2': 'magenta',
    'wintext': 'white',
    'shadow': 'black',
    'text': 'yellow',
    'page': 'brown'
}

# Version flag for file format
FILE_FORMAT_VERSION = 25  # v2.5
