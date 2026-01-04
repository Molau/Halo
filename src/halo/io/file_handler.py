"""
Binary file I/O operations for .HAL and .BEO files
Translated from H_FILES.PAS

The compression scheme packs observation records from ~100 bytes to ~23 bytes
using bit-level packing based on the value ranges of each field.
Special encoding for sector strings (character substitution).
"""

from pathlib import Path
from typing import List
from ..models.types import Observation, Observer
from ..models.constants import FILE_FORMAT_VERSION


class BitPacker:
    """Helper class for bit-level packing and unpacking"""
    
    def __init__(self):
        self.bytes = bytearray()
        self.current_byte = 0
        self.bit_position = 0
    
    def write_bits(self, value: int, num_bits: int):
        """Write specified number of bits from value"""
        for i in range(num_bits):
            bit = (value >> i) & 1
            self.current_byte |= (bit << self.bit_position)
            self.bit_position += 1
            
            if self.bit_position == 8:
                self.bytes.append(self.current_byte)
                self.current_byte = 0
                self.bit_position = 0
    
    def flush(self):
        """Flush any remaining bits"""
        if self.bit_position > 0:
            self.bytes.append(self.current_byte)
            self.current_byte = 0
            self.bit_position = 0
        return bytes(self.bytes)


class BitUnpacker:
    """Helper class for bit-level unpacking"""
    
    def __init__(self, data: bytes):
        self.data = data
        self.byte_index = 0
        self.bit_position = 0
    
    def read_bits(self, num_bits: int) -> int:
        """Read specified number of bits"""
        value = 0
        for i in range(num_bits):
            if self.byte_index >= len(self.data):
                raise ValueError(f"Unexpected end of data at byte {self.byte_index}")
            
            bit = (self.data[self.byte_index] >> self.bit_position) & 1
            value |= (bit << i)
            self.bit_position += 1
            
            if self.bit_position == 8:
                self.byte_index += 1
                self.bit_position = 0
        
        return value


class HaloFileIO:
    """
    Handles reading and writing of compressed .HAL observation files
    File format v2.5 compatibility
    """
    
    BUFFER_SIZE = 150  # Buffer size for batch operations
    
    @staticmethod
    def compress_observation(obs: Observation) -> bytes:
        """
        Compress observation record using bit-packing
        
        Field bit allocations (based on value ranges):
        - vers: 8 bits (0-255)
        - KK: 7 bits (1-160, special handling for >99)
        - O: 3 bits (1-5)
        - JJ: 7 bits (0-99)
        - MM: 4 bits (1-12)
        - TT: 5 bits (1-31)
        - g: 2 bits (0-2)
        - ZS: 5 bits (0-23)
        - ZM: 6 bits (0-59)
        - d: 3 bits (duration, special case 255->3)
        - DD: 7 bits (0-10, with special values)
        - N: 4 bits (0-10)
        - C: 3 bits (cirrus type)
        - c: 4 bits (low clouds)
        - EE: 7 bits (1-99)
        - H: 3 bits (-1 to 3, -1 encoded as 7)
        - F: 3 bits (color, -1 encoded as 7)
        - V: 2 bits (completeness, -1 encoded as 3)
        - f: 4 bits (weather front, -1 encoded as 15)
        - zz: 7 bits (precipitation, -1 encoded as 127)
        - GG: 7 bits (1-39)
        - HO: 7 bits (angle, -1 encoded as 127)
        - HU: 7 bits (angle, -1 encoded as 127)
        - sectors: 15 * 4 bits (special encoding)
        - remark_len + remarks: uncompressed
        """
        packer = BitPacker()
        
        # Byte 0: vers (full byte)
        packer.write_bits(obs.vers, 8)
        
        # Handle special case for KK > 99
        if obs.KK > 99:
            packer.write_bits(0, 7)  # KK=0 signals special case
            packer.write_bits(obs.O, 3)
            packer.write_bits(obs.KK, 8)  # Full byte for actual KK
        else:
            packer.write_bits(obs.KK, 7)
            packer.write_bits(obs.O, 3)
        
        # Date and time fields
        packer.write_bits(obs.JJ, 7)
        packer.write_bits(obs.MM, 4)
        packer.write_bits(obs.TT, 5)
        packer.write_bits(obs.g, 2)
        packer.write_bits(obs.ZS, 5)
        packer.write_bits(obs.ZM, 6)
        
        # Duration (special case 255 -> 3)
        d_val = 3 if obs.d == 255 else obs.d
        packer.write_bits(d_val, 3)
        
        packer.write_bits(obs.DD, 7)
        packer.write_bits(obs.N, 4)
        packer.write_bits(obs.C, 3)
        packer.write_bits(obs.c, 4)
        
        # Halo properties
        packer.write_bits(obs.EE, 7)
        
        # Encode special values as max
        h_val = 7 if obs.H == -1 else obs.H
        f_val = 7 if obs.F == -1 else obs.F
        v_val = 3 if obs.V == -1 else obs.V
        f_front_val = 15 if obs.f == -1 else obs.f
        zz_val = 127 if obs.zz == -1 else obs.zz
        ho_val = 127 if obs.HO == -1 else obs.HO
        hu_val = 127 if obs.HU == -1 else obs.HU
        
        packer.write_bits(h_val, 3)
        packer.write_bits(f_val, 3)
        packer.write_bits(v_val, 2)
        packer.write_bits(f_front_val, 4)
        packer.write_bits(zz_val, 7)
        packer.write_bits(obs.GG, 7)
        packer.write_bits(ho_val, 7)
        packer.write_bits(hu_val, 7)
        
        # Encode sector string (15 chars, 4 bits each)
        sectors = obs.sectors.ljust(15)[:15]
        for c in sectors:
            if c == ' ' or c == '\x00':
                packer.write_bits(0, 4)
            elif c == '/':
                packer.write_bits(9, 4)
            elif c == '-':
                packer.write_bits(10, 4)
            elif '0' <= c <= '9':
                packer.write_bits(int(c), 4)
            else:
                packer.write_bits(0, 4)
        
        # Flush bit packer
        result = packer.flush()
        
        # Append remark (uncompressed)
        remark = obs.remarks[:60]
        result += bytes([len(remark)])
        result += remark.encode('latin-1', errors='replace')
        
        return result
    
    @staticmethod
    def decompress_observation(data: bytes) -> Observation:
        """
        Decompress observation record from bit-packed format
        
        Args:
            data: Compressed bytes
            
        Returns:
            Observation object
        """
        if len(data) < 21:
            raise ValueError(f"Data too short: {len(data)} bytes, need at least 21")
        
        obs = Observation()
        unpacker = BitUnpacker(data)
        
        # Byte 0: vers
        obs.vers = unpacker.read_bits(8)
        
        # Check for special case KK > 99
        k_val = unpacker.read_bits(7)
        obs.O = unpacker.read_bits(3)
        
        if k_val == 0:
            # Special case: actual KK follows
            obs.KK = unpacker.read_bits(8)
        else:
            obs.KK = k_val
        
        # Date and time
        obs.JJ = unpacker.read_bits(7)
        obs.MM = unpacker.read_bits(4)
        obs.TT = unpacker.read_bits(5)
        obs.g = unpacker.read_bits(2)
        obs.ZS = unpacker.read_bits(5)
        obs.ZM = unpacker.read_bits(6)
        
        # Duration
        d_val = unpacker.read_bits(3)
        obs.d = 255 if d_val == 3 else d_val
        
        obs.DD = unpacker.read_bits(7)
        obs.N = unpacker.read_bits(4)
        obs.C = unpacker.read_bits(3)
        obs.c = unpacker.read_bits(4)
        
        # Halo properties
        obs.EE = unpacker.read_bits(7)
        
        h_val = unpacker.read_bits(3)
        obs.H = -1 if h_val == 7 else h_val
        
        f_val = unpacker.read_bits(3)
        obs.F = -1 if f_val == 7 else f_val
        
        v_val = unpacker.read_bits(2)
        obs.V = -1 if v_val == 3 else v_val
        
        f_front_val = unpacker.read_bits(4)
        obs.f = -1 if f_front_val == 15 else f_front_val
        
        zz_val = unpacker.read_bits(7)
        obs.zz = -1 if zz_val == 127 else zz_val
        
        obs.GG = unpacker.read_bits(7)
        
        ho_val = unpacker.read_bits(7)
        obs.HO = -1 if ho_val == 127 else ho_val
        
        hu_val = unpacker.read_bits(7)
        obs.HU = -1 if hu_val == 127 else hu_val
        
        # Decode sector string (15 chars, 4 bits each)
        sector_chars = []
        for i in range(15):
            val = unpacker.read_bits(4)
            if val == 0:
                sector_chars.append(' ')
            elif val == 9:
                sector_chars.append('/')
            elif val == 10:
                sector_chars.append('-')
            elif 1 <= val <= 8:
                sector_chars.append(str(val))
            else:
                sector_chars.append(' ')
        
        obs.sectors = ''.join(sector_chars).rstrip()
        
        # Read remark (uncompressed, starts at byte boundary after bit-packed data)
        byte_offset = unpacker.byte_index
        if unpacker.bit_position > 0:
            byte_offset += 1
        
        if byte_offset < len(data):
            obs.remark_len = data[byte_offset]
            byte_offset += 1
            
            if obs.remark_len > 0 and byte_offset + obs.remark_len <= len(data):
                remark_bytes = data[byte_offset:byte_offset + obs.remark_len]
                obs.remarks = remark_bytes.decode('latin-1', errors='replace')
            else:
                obs.remarks = ""
        else:
            obs.remark_len = 0
            obs.remarks = ""
        
        return obs
    
    @staticmethod
    def read_observations(filepath: Path) -> List[Observation]:
        """
        Read all observations from a .HAL file
        
        Args:
            filepath: Path to .HAL file
            
        Returns:
            List of Observation objects
        """
        observations = []
        
        with open(filepath, 'rb') as f:
            while True:
                start_pos = f.tell()
                # Read enough bytes for worst case (k>99, full remark)
                chunk = f.read(100)
                
                if len(chunk) < 21:
                    break
                
                try:
                    obs = HaloFileIO.decompress_observation(chunk)
                    observations.append(obs)
                    
                    # Calculate actual bytes consumed
                    # Base: 165 bits = 21 bytes (without special KK, rounded up)
                    # If special KK: +1 byte = 22 bytes base
                    special_k = (chunk[1] & 0xFE) == 0
                    base_bytes = 22 if special_k else 21
                    
                    remark_len = chunk[base_bytes] if base_bytes < len(chunk) else 0
                    total_bytes = base_bytes + 1 + remark_len
                    
                    # Seek to next record
                    f.seek(start_pos + total_bytes)
                    
                except Exception as e:
                    import traceback
                    print(f"Error at position {start_pos}: {e}")
                    traceback.print_exc()
                    break
        
        return observations
    
    @staticmethod
    def write_observations(filepath: Path, observations: List[Observation]) -> None:
        """
        Write observations to a .HAL file
        
        Args:
            filepath: Path to .HAL file
            observations: List of Observation objects to write
        """
        with open(filepath, 'wb') as f:
            for obs in observations:
                compressed = HaloFileIO.compress_observation(obs)
                f.write(compressed)
    
    @staticmethod
    def read_observers(filepath: Path) -> List[Observer]:
        """
        Read observers from .BEO file
        Binary format (uncompressed, fixed record size)
        
        Args:
            filepath: Path to .BEO file
            
        Returns:
            List of Observer objects
        """
        observers = []
        
        # TODO: Implement actual observer file format reading
        # Observer record structure needs to be determined from actual file
        
        return observers
    
    @staticmethod
    def write_observers(filepath: Path, observers: List[Observer]) -> None:
        """
        Write observers to .BEO file
        
        Args:
            filepath: Path to .BEO file
            observers: List of Observer objects to write
        """
        # TODO: Implement actual observer file format writing
        pass
