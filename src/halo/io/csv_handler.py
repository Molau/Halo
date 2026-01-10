"""
CSV-based file I/O for observation data
Simpler alternative to binary format for initial development
"""

import csv
from pathlib import Path
from typing import List
from ..models.types import Observation


class ObservationCSV:
    """
    Handle CSV import/export of observations
    Format: KK,O,JJ,MM,TT,g,ZS,ZM,d,DD,N,C,c,EE,H,F,V,f,zz,GG,8HHHH,sectors,remarks
    Note: 8HHHH is a combined field (5 chars), not separate ho/hu
    """
    
    @staticmethod
    def _parse_int(value: str, default: int = -1) -> int:
        """Parse integer, handling '/' and spaces as unknown (-1)"""
        value = value.strip()
        if not value or value == '/' or value == ' ':
            return default
        try:
            return int(value)
        except ValueError:
            return default
    
    @staticmethod
    def read_observations(filepath: Path) -> List[Observation]:
        """
        Read observations from CSV file
        
        Args:
            filepath: Path to CSV file
            
        Returns:
            List of Observation objects
        """
        observations = []
        
        with open(filepath, 'r', encoding='latin-1') as f:
            for line in f:
                parts = line.rstrip(',\n').split(',')
                if len(parts) < 20:
                    continue
                
                obs = Observation()
                obs.vers = 25
                obs.KK = ObservationCSV._parse_int(parts[0], -1)
                obs.O = ObservationCSV._parse_int(parts[1], -1)
                obs.JJ = ObservationCSV._parse_int(parts[2], -1)
                obs.MM = ObservationCSV._parse_int(parts[3], -1)
                obs.TT = ObservationCSV._parse_int(parts[4], -1)
                obs.g = ObservationCSV._parse_int(parts[5], -1)
                obs.ZS = ObservationCSV._parse_int(parts[6], -1)
                obs.ZM = ObservationCSV._parse_int(parts[7], -1)
                # Order per spec: ..., ZS, ZM, d, DD, N, C, c, ...
                obs.d = ObservationCSV._parse_int(parts[8], -1)
                obs.DD = ObservationCSV._parse_int(parts[9], -1)
                
                obs.N = ObservationCSV._parse_int(parts[10], -1)
                obs.C = ObservationCSV._parse_int(parts[11], -1)
                obs.c = ObservationCSV._parse_int(parts[12], -1)
                obs.EE = ObservationCSV._parse_int(parts[13], -1)
                obs.H = ObservationCSV._parse_int(parts[14], -1)
                obs.F = ObservationCSV._parse_int(parts[15], -1)
                obs.V = ObservationCSV._parse_int(parts[16], -1)
                
                # f and zz: space means unknown/-1
                ff_str = parts[17].strip()
                obs.f = -1 if not ff_str or ff_str == '/' else ObservationCSV._parse_int(ff_str, -1)
                
                zz_str = parts[18].strip()
                obs.zz = -1 if not zz_str or zz_str == '/' else ObservationCSV._parse_int(zz_str, -1)
                
                obs.GG = ObservationCSV._parse_int(parts[19], -1)
                
                # Parse 8HHHH field (field 20) to extract ho and hu
                # Format: 8HHHH where first two H are ho, last two H are hu
                # Examples: /////=no data, 8////=E=8 no data, 810//=E=8 ho=10, 8//15=E=9 hu=15
                ho_hu_field = parts[20] if len(parts) > 20 else "/////"
                if len(ho_hu_field) >= 5:
                    # ho is chars 1-2 (0-indexed), hu is chars 3-4
                    ho_str = ho_hu_field[1:3]
                    hu_str = ho_hu_field[3:5]
                    obs.HO = ObservationCSV._parse_int(ho_str, -1)
                    obs.HU = ObservationCSV._parse_int(hu_str, -1)
                else:
                    obs.HO = -1
                    obs.HU = -1
                
                # Sectors (field 21) and remarks (field 22)
                obs.sectors = parts[21] if len(parts) > 21 else ""
                obs.remarks = parts[22] if len(parts) > 22 else ""
                
                observations.append(obs)
        
        return observations

    @staticmethod
    def read_observations_from_stream(stream) -> List[Observation]:
        """Read observations from an in-memory text stream (CSV format)."""
        observations = []
        for line in stream:
            parts = line.rstrip(',\n').split(',')
            if len(parts) < 20:
                continue

            obs = Observation()
            obs.vers = 25
            obs.KK = ObservationCSV._parse_int(parts[0], -1)
            obs.O = ObservationCSV._parse_int(parts[1], -1)
            obs.JJ = ObservationCSV._parse_int(parts[2], -1)
            obs.MM = ObservationCSV._parse_int(parts[3], -1)
            obs.TT = ObservationCSV._parse_int(parts[4], -1)
            obs.g = ObservationCSV._parse_int(parts[5], -1)
            obs.ZS = ObservationCSV._parse_int(parts[6], -1)
            obs.ZM = ObservationCSV._parse_int(parts[7], -1)
            # Order per spec: ..., ZS, ZM, d, DD, N, C, c, ...
            obs.d = ObservationCSV._parse_int(parts[8], -1)
            obs.DD = ObservationCSV._parse_int(parts[9], -1)
            obs.N = ObservationCSV._parse_int(parts[10], -1)
            obs.C = ObservationCSV._parse_int(parts[11], -1)
            obs.c = ObservationCSV._parse_int(parts[12], -1)
            obs.EE = ObservationCSV._parse_int(parts[13], -1)
            obs.H = ObservationCSV._parse_int(parts[14], -1)
            obs.F = ObservationCSV._parse_int(parts[15], -1)
            obs.V = ObservationCSV._parse_int(parts[16], -1)

            ff_str = parts[17].strip()
            obs.f = -1 if not ff_str or ff_str == '/' else ObservationCSV._parse_int(ff_str, -1)

            zz_str = parts[18].strip()
            obs.zz = -1 if not zz_str or zz_str == '/' else ObservationCSV._parse_int(zz_str, -1)

            obs.GG = ObservationCSV._parse_int(parts[19], -1)

            # Parse 8HHHH field (field 20) to extract ho and hu
            ho_hu_field = parts[20] if len(parts) > 20 else "/////"
            if len(ho_hu_field) >= 5:
                ho_str = ho_hu_field[1:3]
                hu_str = ho_hu_field[3:5]
                obs.HO = ObservationCSV._parse_int(ho_str, -1)
                obs.HU = ObservationCSV._parse_int(hu_str, -1)
            else:
                obs.HO = -1
                obs.HU = -1

            # Sectors (field 21) and remarks (field 22)
            obs.sectors = parts[21] if len(parts) > 21 else ""
            obs.remarks = parts[22] if len(parts) > 22 else ""

            observations.append(obs)

        return observations
    
    @staticmethod
    def write_observations(filepath: Path, observations: List[Observation]) -> None:
        """
        Write observations to CSV file
        
        Args:
            filepath: Path to CSV file
            observations: List of Observation objects
        """
        with open(filepath, 'w', encoding='latin-1', newline='') as f:
            for obs in observations:
                # Format each field
                d_str = '/' if obs.d == 255 else f'{obs.d:02d}'
                ff_str = ' ' if obs.f == -1 else f'{obs.f:02d}'
                zz_str = '  ' if obs.zz == -1 else f'{obs.zz:02d}'
                
                fields = [
                    f'{obs.KK:02d}',
                    str(obs.O),
                    f'{obs.JJ:02d}',
                    f'{obs.MM:02d}',
                    f'{obs.TT:02d}',
                    f'{obs.g:01d}',
                    f'{obs.ZS:02d}',
                    f'{obs.ZM:02d}',
                    d_str,
                    f'{obs.DD:02d}',
                    str(obs.N) if obs.N != -1 else '/',
                    str(obs.C) if obs.C != -1 else '/',
                    str(obs.c) if obs.c != -1 else '/',
                    f'{obs.EE:02d}',
                    str(obs.H),
                    str(obs.F) if obs.F != -1 else '/',
                    str(obs.V) if obs.V != -1 else '/',
                    ff_str,
                    zz_str,
                    f'{obs.GG:02d}',
                    obs.sectors.ljust(5, '/'),
                    obs.remarks.ljust(15),
                ]
                
                f.write(','.join(fields) + ',\n')
