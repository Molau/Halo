"""
Astronomical calculations for HALO observations.

Translated from H_AUSW.PAS - Sonnenhoehe function.
"""

import math
from typing import Optional


def calculate_solar_altitude(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    duration: int,
    longitude: float,
    latitude: float,
    altitude_type: str = 'mean',
    gg: int = 0
) -> int:
    """
    Calculate solar altitude (sun's elevation above horizon) in degrees.
    
    This is a direct translation of the Pascal Sonnenhoehe function from H_AUSW.PAS.
    
    Args:
        year: 2-digit year (e.g., 88 for 1988, 05 for 2005)
        month: Month (1-12)
        day: Day of month (1-31)
        hour: Hour in CET (0-23)
        minute: Minute (0-59)
        duration: Duration in minutes
        longitude: Observer's longitude in degrees (negative for West)
        latitude: Observer's latitude in degrees (negative for South)
        altitude_type: 'min' (minimum), 'mean' (average), or 'max' (maximum) altitude during observation
        gg: Observation site type (0=main site, other=alternate site)
    
    Returns:
        Solar altitude in degrees (rounded to nearest integer)
    """
    # Convert year to 4-digit format
    jahr = 1900 + year
    if jahr < 1950:
        jahr = jahr + 100
    
    # Helper function to calculate altitude at a specific time
    def calc_altitude_at_time(zeit):
        """Calculate solar altitude at a specific time."""
        # Normalize time to 24-hour format
        zeit = zeit % 24
        
        # Calculate day of year (n)
        n = (math.trunc(275 / 9 * month) - 
             math.trunc((month + 9) / 12) * 
             (1 + math.trunc((jahr - 4 * math.trunc(jahr / 4) + 2) / 3)) + 
             day - 30)
        
        # Calculate time parameter
        t = n + (zeit - longitude / 15.0) / 24.0
        
        # Calculate sun's mean anomaly (m)
        m = 0.985600 * t - 3.289
        
        # Calculate sun's ecliptic longitude (l)
        l = m + 1.916 * math.sin(m * math.pi / 180.0) + 0.020 * math.sin(2 * m * math.pi / 180.0) + 282.634
        
        # Normalize l to 0-360 range
        l = l % 360
        
        # Calculate sun's right ascension (al)
        al = 180 * math.atan(0.91746 * math.sin(l * math.pi / 180.0) / math.cos(l * math.pi / 180.0)) / math.pi
        
        # Adjust right ascension to correct quadrant
        if (l > 90) and (l < 270):
            al = al + 180
        
        # Calculate sun's declination (de)
        de = 180 * math.asin(0.39782 * math.sin(l * math.pi / 180.0)) / math.pi
        
        # Calculate Julian date (jd)
        if month > 2:
            jd = math.trunc(30.6001 * (month + 1)) + math.trunc(365.25 * jahr)
        else:
            jd = math.trunc(30.6001 * (month + 13)) + math.trunc(365.25 * (jahr - 1))
        
        jd = jd + 1720994.5 + 2 - math.trunc(jahr / 100) + math.trunc(jahr / 400) + day + zeit / 24.0
        
        # Calculate time in Julian centuries from J2000.0
        t2 = (jd - 2451545) / 36525.0
        
        # Calculate Greenwich sidereal time at 0h UT
        st0 = 6.697375 + 2400.051337 * t2 + 0.0000359 * t2 * t2
        
        # Calculate local sidereal time
        st = st0 + longitude / 15.0 + 1.002737909 * (zeit - 1)
        
        # Calculate hour angle of the sun (sw)
        sw = (15 * st - al) % 360
        
        # Calculate solar altitude using spherical trigonometry
        altitude_rad = math.asin(
            math.sin(latitude * math.pi / 180.0) * math.sin(de * math.pi / 180.0) +
            math.cos(sw * math.pi / 180.0) * math.cos(de * math.pi / 180.0) * math.cos(latitude * math.pi / 180.0)
        )
        
        altitude_deg = altitude_rad / math.pi * 180.0
        return altitude_deg
    
    # Calculate observation time(s) based on altitude_type
    time_start = hour + minute / 60.0
    
    if altitude_type == 'mean':
        # Mean altitude: calculate at midpoint of observation
        # Duration is in minutes, so divide by 60 to get hours
        time_mid = time_start + duration / 120.0  # duration/2 / 60
        altitude_deg = calc_altitude_at_time(time_mid)
    else:
        # Min or Max: calculate at both start and end
        altitude_start = calc_altitude_at_time(time_start)
        
        # Duration is in minutes, divide by 60 to get hours
        time_end = time_start + duration / 60.0
        altitude_end = calc_altitude_at_time(time_end)
        
        if altitude_type == 'min':
            # Minimum altitude
            altitude_deg = min(altitude_start, altitude_end)
        else:  # altitude_type == 'max'
            # Maximum altitude
            altitude_deg = max(altitude_start, altitude_end)
    
    # Round and divide by 2 (as in original Pascal: DIV 2)
    return round(altitude_deg)


def get_observer_coordinates(observer_record: dict, gg: int) -> tuple[float, float]:
    """
    Extract observer's latitude and longitude from observer record.
    
    Args:
        observer_record: Observer record dictionary with location fields
        gg: Observation site type (0=main site, 2=alternate site, 1=outside known sites)
    
    Returns:
        Tuple of (longitude, latitude) in decimal degrees
        Returns (0.0, 0.0) if location is unknown (gg=1)
    """
    if gg == 0:
        # Main observing site (H = Haupt)
        lon_deg = int(observer_record.get('HLG', 0) or 0)
        lon_min = int(observer_record.get('HLM', 0) or 0)
        lon_ew = observer_record.get('HOW', 'O')  # 'O' (Ost) or 'W' (West)
        
        lat_deg = int(observer_record.get('HBG', 0) or 0)
        lat_min = int(observer_record.get('HBM', 0) or 0)
        lat_ns = observer_record.get('HNS', 'N')  # 'N' (Nord) or 'S' (Süd)
    elif gg == 2:
        # Alternate observing site (N = Neben)
        lon_deg = int(observer_record.get('NLG', 0) or 0)
        lon_min = int(observer_record.get('NLM', 0) or 0)
        lon_ew = observer_record.get('NOW', 'O')  # 'O' (Ost) or 'W' (West)
        
        lat_deg = int(observer_record.get('NBG', 0) or 0)
        lat_min = int(observer_record.get('NBM', 0) or 0)
        lat_ns = observer_record.get('NNS', 'N')  # 'N' (Nord) or 'S' (Süd)
    else:
        # g=1: outside known sites - location unknown
        return (0.0, 0.0)
    
    # Convert to decimal degrees
    longitude = lon_deg + lon_min / 60.0
    if lon_ew == 'W':
        longitude = -longitude
    
    latitude = lat_deg + lat_min / 60.0
    if lat_ns == 'S':
        latitude = -latitude
    
    return longitude, latitude
