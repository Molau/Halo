"""
Core data structures for HALO observations and observers
Translated from H_TYPES.PAS
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Observation:
    """
    Observation record (Beobachtg in Pascal)
    Represents a single halo observation
    
    Field sizes maintained for binary compatibility:
    - Byte fields: 0-255
    - ShortInt fields: -128 to 127
    - String15: max 15 characters
    - String60: max 60 characters
    """
    # Version and observer
    vers: int = 25  # Byte - File format version (v2.5 = 25)
    KK: int = 0  # Byte - Observer ID (1-160)
    
    # Object and date
    O: int = 0  # ShortInt - Object type (1-5)
    JJ: int = 0  # ShortInt - Year (0-99, relative to 1900 or 2000)
    MM: int = 0  # ShortInt - Month (1-12)
    TT: int = 0  # ShortInt - Day (1-31)
    g: int = 0  # ShortInt - Observation location (0-2: main/secondary/other)
    
    # Time
    ZS: int = 0  # ShortInt - Hour (0-23)
    ZM: int = 0  # ShortInt - Minute (0-59)
    d: int = 0  # ShortInt - Origin/Density (0-7)
    
    # Conditions
    DD: int = 0  # ShortInt - Duration (×10 minutes)
    N: int = 0  # ShortInt - Cloud cover (0-10)
    C: int = 0  # ShortInt - Cirrus type
    c: int = 0  # ShortInt - Low clouds
    
    # Halo properties
    EE: int = 0  # ShortInt - Halo type (1-99)
    H: int = 0  # ShortInt - Brightness (-1 to 3)
    F: int = 0  # ShortInt - Color
    V: int = 0  # ShortInt - Completeness/Visibility
    
    # Additional properties
    f: int = 0  # ShortInt - Weather front
    zz: int = 0  # ShortInt - Precipitation
    GG: int = 0  # ShortInt - Geographic region (1-39)
    
    # Light pillar angles
    HO: int = 0  # ShortInt - Upper light pillar angle
    HU: int = 0  # ShortInt - Lower light pillar angle
    
    # Sectors (for circular halos)
    sectors: str = ""  # String15 - Sector information (max 15 chars)
    
    # Remarks
    remark_len: int = 0  # ShortInt - Length of remark
    remarks: str = ""  # String60 - Remark text (max 60 chars)
    
    def __post_init__(self):
        """Validate and truncate string fields to maintain binary compatibility"""
        if len(self.sectors) > 15:
            self.sectors = self.sectors[:15]
        if len(self.remarks) > 60:
            self.remarks = self.remarks[:60]
        self.remark_len = len(self.remarks)


@dataclass
class FilterMask:
    """
    Filter mask for searching/filtering observations (Maske in Pascal)
    Includes the filter values and boolean flags indicating which fields to filter
    """
    # Filter values
    KK: int = 0  # Byte - Observer ID
    O: int = 0  # ShortInt - Object type
    JJ: int = 0  # ShortInt - Year
    MM: int = 0  # ShortInt - Month
    TT: int = 0  # ShortInt - Day
    g: int = 0  # ShortInt - Observation location
    ZS: int = 0  # ShortInt - Hour
    ZM: int = 0  # ShortInt - Minute
    d: int = 0  # ShortInt - Origin/Density
    DD: int = 0  # ShortInt - Duration
    N: int = 0  # ShortInt - Cloud cover
    C: int = 0  # ShortInt - Cirrus type
    c: int = 0  # ShortInt - Low clouds
    EE: int = 0  # ShortInt - Halo type
    H: int = 0  # ShortInt - Brightness
    F: int = 0  # ShortInt - Color
    V: int = 0  # ShortInt - Completeness
    f: int = 0  # ShortInt - Weather front
    zz: int = 0  # ShortInt - Precipitation
    GG: int = 0  # ShortInt - Geographic region
    
    # Boolean flags indicating which fields to use for filtering
    KKg: bool = False  # Filter by observer
    Og: bool = False  # Filter by object
    JJg: bool = False  # Filter by year
    MMg: bool = False  # Filter by month
    TTg: bool = False  # Filter by day
    gg: bool = False  # Filter by observation location
    ZSg: bool = False  # Filter by hour
    ZMg: bool = False  # Filter by minute
    dg: bool = False  # Filter by origin/density
    DDg: bool = False  # Filter by duration
    Ng: bool = False  # Filter by cloud cover
    Cg: bool = False  # Filter by cirrus type
    cg: bool = False  # Filter by low clouds
    EEg: bool = False  # Filter by halo type
    Hg: bool = False  # Filter by brightness
    Fg: bool = False  # Filter by color
    Vg: bool = False  # Filter by completeness
    fg: bool = False  # Filter by weather front
    zzg: bool = False  # Filter by precipitation
    GGg: bool = False  # Filter by geographic region
    
    # Solar altitude filters
    sh: int = 0  # ShortInt - Solar altitude
    ls: int = 0  # ShortInt - Solar altitude at start
    se: int = 0  # ShortInt - Solar altitude at end
    shg: bool = False  # Filter by solar altitude
    lsg: bool = False  # Filter by solar altitude at start
    seg: bool = False  # Filter by solar altitude at end
    
    # Additional filters
    ph: int = 0  # Integer - ?
    phg: bool = False
    ggg: bool = False
    ng: bool = False
    ccg: bool = False


@dataclass
class Observer:
    """
    Observer record (Beobachter in Pascal)
    Represents a single observer with main and secondary observation locations
    """
    # Version and ID
    v: int = 25  # Byte - Version
    k: int = 0  # Byte - Observer ID (1-160)
    
    # Names
    v_name: str = ""  # String15 - First name (max 15 chars)
    n_name: str = ""  # String15 - Last name (max 15 chars)
    
    # Main observation location
    hb_ort: str = ""  # String20 - Main location name (max 20 chars)
    nb_ort: str = ""  # String20 - Secondary location name (max 20 chars)
    
    # Main location elevation
    gh: int = 0  # ShortInt - ?
    gn: int = 0  # ShortInt - ?
    
    # Main location coordinates
    hlg: int = 0  # Integer - Longitude degrees
    hlm: int = 0  # Integer - Longitude minutes
    hbg: int = 0  # Integer - Latitude degrees
    hbm: int = 0  # Integer - Latitude minutes
    hns: str = "N"  # Char - N/S hemisphere
    how: str = "E"  # Char - E/W hemisphere
    
    # Secondary location coordinates
    nlg: int = 0  # Integer - Longitude degrees
    nlm: int = 0  # Integer - Longitude minutes
    nbg: int = 0  # Integer - Latitude degrees
    nbm: int = 0  # Integer - Latitude minutes
    nns: str = "N"  # Char - N/S hemisphere
    now: str = "E"  # Char - E/W hemisphere
    
    # Observer status
    since: int = 0  # Integer - Member since (year)
    active: bool = True  # Boolean - Currently active
    
    def __post_init__(self):
        """Validate and truncate string fields to maintain binary compatibility"""
        if len(self.v_name) > 15:
            self.v_name = self.v_name[:15]
        if len(self.n_name) > 15:
            self.n_name = self.n_name[:15]
        if len(self.hb_ort) > 20:
            self.hb_ort = self.hb_ort[:20]
        if len(self.nb_ort) > 20:
            self.nb_ort = self.nb_ort[:20]
        # Ensure hemisphere indicators are single chars
        if self.hns:
            self.hns = self.hns[0].upper()
        if self.how:
            self.how = self.how[0].upper()
        if self.nns:
            self.nns = self.nns[0].upper()
        if self.now:
            self.now = self.now[0].upper()


# Type aliases for clarity
ObserverList = list[Observer]
ObservationList = list[Observation]
