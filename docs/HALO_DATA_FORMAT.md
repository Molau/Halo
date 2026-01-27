# HALO Data Format Documentation

> **📋 Documentation Type**: THE STANDARD (Fixed Requirements)  
> **Status**: Cannot be changed - standardized observation record format  
> **Authority**: HALO Key standard, independent of program implementation  
> **Usage**: Source of truth for data structure, field dependencies, validation rules  
> **See also**: [PROJECT_GUIDELINES.md](PROJECT_GUIDELINES.md) for complete documentation hierarchy

---

## Overview
This document describes the HALO Key observation record format - a standardized format used by the observation community for decades. This format is **fixed and cannot be changed** as it is defined independently of any particular implementation. All validation rules, field dependencies, and data structures documented here must be strictly applied.

## Special Value Encoding

The HALO Key uses two distinct encodings for missing or unavailable data:

- **Space or empty**: Not observed or unknown
  - Example: Observer did not record this field
  - Example: Information not available at time of observation
  - Internal encoding: `-1`
  - Used for: Most fields (ZZZZ, DD, N, C, c, H, F, V, zz, sectors)
  
**Important**: Most fields have their own values for "not present" (usually 0). For example:
- N, C, c: 0 = no halo, -1 = unknown
- f: 0 = other forms, -1 = unknown

## Record Key Format

The observation data follows this format:
```
KKOJJ MMTTg ZZZZd DDNCc EEHFV fzzGG 8HHHH Sektoren Bemerkungen
```

**Note on Pascal Variable Names**: Since Pascal is case-insensitive, the original source code (`H_TYPES.PAS`) uses a naming convention based on whether the HALO key element uses capital or lowercase letters:

- **Lowercase HALO key elements** (g, d, c, f) → **Two lowercase letters in Pascal** (gg, dd, cc, ff)
- **Capital HALO key elements** (KK, O, JJ, MM, TT, DD, GG, etc.) → **One capital letter in Pascal** (K, O, J, M, T, D, G, etc.)
- **Already two lowercase letters** (zz) → **Same in Pascal** (zz)

Examples:
- HALO key **"KK"** (capitals) → Pascal **`K`** (one capital)
- HALO key **"O"** (capital) → Pascal **`O`** (one capital)
- HALO key **"g"** (lowercase) → Pascal **`gg`** (two lowercase)
- HALO key **"d"** (lowercase) → Pascal **`dd`** (two lowercase) - weather condition
- HALO key **"DD"** (capitals) → Pascal **`D`** (one capital) - cirrus density
- HALO key **"GG"** (capitals) → Pascal **`G`** (one capital)
- HALO key **"zz"** (already two lowercase) → Pascal **`zz`** (same)

Complete mapping:
- `K` (Byte) = **KK** field (observer number)
- `O` (ShortInt) = **O** field
- `J` (ShortInt) = **JJ** field (year)
- `M` (ShortInt) = **MM** field (month)
- `T` (ShortInt) = **TT** field (day)
- `gg` (ShortInt) = **g** field (location)
- `ZS` (ShortInt) = **ZZ** (start time hours)
- `ZM` (ShortInt) = **ZZ** (start time minutes)
- `dd` (ShortInt) = **d** field (weather condition)
- `D` (ShortInt) = **DD** field (cirrus density)
- `N` (ShortInt) = **N** field
- `C` (ShortInt) = **C** field
- `cc` (ShortInt) = **c** field (cloud cover after)
- `E` (ShortInt) = **EE** field
- `H` (ShortInt) = **H** field
- `F` (ShortInt) = **F** field
- `V` (ShortInt) = **V** field
- `ff` (ShortInt) = **f** field
- `zz` (ShortInt) = **zz** field
- `G` (ShortInt) = **GG** field (region)
- `HO` (ShortInt) = **HH** (height upper)
- `HU` (ShortInt) = **HH** (height lower)

**Important**: When reading Pascal code, remember that `elem.dd` refers to the **d** field (weather), not `elem.D` which is the **DD** field (duration).

---

## Field Definitions

### 1. KK - Observer Number (Beobachter Kennummer)
- **Pascal Variable**: `K` (Byte)
- **Position**: Characters 1-2
- **Type**: Integer (2 digits)
- **Range**: 01-99
- **Dependencies**: Must exist in observer database (Beo^[K].k = K)
- **Special Values**: None allowed (required field)

### 2. O - Object (Objekt)
- **Pascal Variable**: `O` (Byte)
- **Position**: Character 3
- **Type**: Integer (1 digit)
- **Range**: 1-5
- **Values**: See ConO array
  - 1: Sonnenhalo / Sun
  - 2: Mondhalo / Moon
  - 3: Planetenhalo / a planet
  - 4: Sternhalo / a bright star
  - 5: Halo um eine irdische Lichtquelle / an earthbound light source
- **Special Values**: None allowed (required field)
- **Validation**: Must be 1-5

### 3. JJ - Year (Jahr)
- **Pascal Variable**: `J` (ShortInt)
- **Position**: Characters 4-5
- **Type**: Integer (2 digits)
- **Range**: 00-99 (represents 19xx or 20xx)
- **Special Values**: None (required field)
- **Validation**: Must be valid year
- **Note**: Automatic carry-over handling for years < 50 (treated as 20xx) vs ≥ 50 (treated as 19xx)

### 4. MM - Month (Monat)
- **Pascal Variable**: `M` (ShortInt)
- **Position**: Characters 6-7
- **Type**: Integer (2 digits)
- **Range**: 01-12
- **Special Values**: None (required field)
- **Validation**: Must be 01-12

### 5. TT - Day (Tag)
- **Pascal Variable**: `T` (ShortInt)
- **Position**: Characters 8-9
- **Type**: Integer (2 digits)
- **Range**: 01-31 (depending on month)
- **Dependencies**: Must be valid for given month (uses Tage[M] array)
- **Special Values**: None (required field)
- **Validation**: 
  - Must be 01-31
  - Must not exceed days in month

### 6. g - Observation Location (Beobachtungsort)
- **Pascal Variable**: `gg` (ShortInt)
- **Position**: Character 10
- **Type**: Integer (1 digit)
- **Range**: 0-2
- **Values**: See Cong array
  - 0: Hauptbeobachtungsort / primary observing site
  - 1: außerhalb von Haupt- und Nebenbeobachtungsort / neither primary nor secondary observing site (requires GG specification)
  - 2: Nebenbeobachtungsort / secondary observing site
- **Dependencies**: 
  - When g=0: Uses observer's HbOrt and GH fields (see Observer Record Structure)
  - When g=1: Requires manual GG (region) input
  - When g=2: Uses observer's NbOrt and GN fields (see Observer Record Structure)
- **Special Values**: None (required field)

### 7. ZZZZ - Time (Zeit)
- **Pascal Variables**: `ZS` (hours), `ZM` (minutes) (both ShortInt)
- **Position**: Characters 11-14 (ZS=11-12, ZM=13-14)
- **Type**: Two integers (2 digits each)
- **Components**:
    - **ZS** (ZeitStunden): Hours (00-23)
    - **ZM** (ZeitMinuten): Minutes (00-59)
- **Range**: 00:00 - 23:59
- **Timezone**: CET (Central European Time)
- **Dependencies**: Both must be specified or both unspecified
- **Special Values**: 
    - `  ` `  ` = Time not specified (ZS=-1, ZM=-1)
- **Validation**: 
    - Hours: 0-23
    - Minutes: 0-59

### 8. d - Origin/Density (Dichte/Entstehungsort)
- **Pascal Variable**: `dd` (ShortInt)
- **Position**: Character 15
- **Type**: Integer (1 digit)
- **Range**: 0-7 (excluding 3)
- **Values**: See Condd array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 0: sehr dünner bis dünner Cirrus / very thin to thin cirrus
  - 1: normaler Cirrus / normal cirrus
  - 2: dichter bis sehr dichter Cirrus / thick to very thick cirrus
  - 3: [empty - invalid/not used]
  - 4: Reif / white frost
  - 5: Schneedecke / snow cover
  - 6: Eisnebel/Polarschnee / ice nebulae/polar snow
  - 7: Fallstreifen (virga) / virga
- **Dependencies**: 
  - see below
- **Special Values**: 
  - `/` = no cirrus (value -2)

### 9. DD - Duration (Dauer)
- **Pascal Variable**: `D` (ShortInt)
- **Position**: Characters 16-17
- **Type**: Integer (2 digits)
- **Range**: 00-99 (represents duration × 10 minutes)
- **Unit**: Value × 10 = actual minutes
- **Example**: 
  - DD=05 means 50 minutes
  - DD=12 means 120 minutes
- **Dependencies**: None
- **Special Values**: 
  - `  ` = Duration not specified (value -1)

### 10. N - Cloud Cover (Himmelsbedeckung)
- **Pascal Variable**: `N` (ShortInt)
- **Position**: Character 18
- **Type**: Integer (1 digit)
- **Values**: See ConN array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 0: Cirrus nicht vorhanden / no cirrus clouds (only valid when d ≥ 4, automatically set)
  - 1: 1/8 mit Cirren bedeckt / 1/8 covered with cirrus
  - 2: 2/8 mit Cirren bedeckt / 2/8 covered with cirrus
  - 3: 3/8 mit Cirren bedeckt / 3/8 covered with cirrus
  - 4: 4/8 mit Cirren bedeckt / 4/8 covered with cirrus
  - 5: 5/8 mit Cirren bedeckt / 5/8 covered with cirrus
  - 6: 6/8 mit Cirren bedeckt / 6/8 covered with cirrus
  - 7: 7/8 mit Cirren bedeckt / 7/8 covered with cirrus
  - 8: 8/8 mit Cirren bedeckt / 8/8 covered with cirrus
  - 9: wegen tiefer Wolken nicht beobachtbar / not able to determine due to lower clouds
- **Dependencies**: 
  - see below

### 11. C - Cirrus Type (Cirrustyp)
- **Pascal Variable**: `C` (ShortInt)
- **Position**: Character 19
- **Type**: Integer (1 digit)
- **Range**: 0-7
- **Values**: See ConC array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 0: Cirrus nicht vorhanden / no cirrus clouds (only when forced by d ≥ 4)
  - 1: Cirrus (Ci)
  - 2: Cirrocumulus (Cc)
  - 3: Cirrostratus (Cs)
  - 4: Ci + Cc
  - 5: Ci + Cs
  - 6: Cc + Cs
  - 7: Ci + Cc + Cs
- **Dependencies**: 
  - see below

### 12. c - Low Cloud Cover (tiefe Bewölkung)
- **Pascal Variable**: `cc` (ShortInt)
- **Position**: Character 20
- **Type**: Integer (1 digit)
- **Range**: 0-9
- **Values**: See Concc array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 0: nicht vorhanden / no lower clouds
  - 1: Stratus (St)
  - 2: Stratocumulus (Sc)
  - 3: St + Sc
  - 4: Nimbostratus (m/o Stratus) / Nimbostratus (m/u Stratus)
  - 5: Cumulus
  - 6: Cumulonimbus
  - 7: Altostratus (As)
  - 8: Altocumulus (Ac)
  - 9: As + Ac
- **Dependencies**: 
  - se below

### 13. EE - Halo Type (Haloart)
- **Pascal Variable**: `E` (ShortInt)
- **Position**: Characters 21-22
- **Type**: Integer (2 digits)
- **Range**: 01-78, 99
- **Values**: See ConE array
  - 01: 22°-Ring / 22° halo
  - 02: linke 22°-Nebensonne / left 22° parhelion
  - 03: rechte 22°-Nebensonne / right 22° parhelion
  - 04: beide 22°-Nebensonnen / both 22° parhelia
  - 05: oberer 22°-Berührungsbogen / upper 22° tangent arc
  - 06: unterer 22°-Berührungsbogen / lower 22° tangent arc
  - 07: umschriebener Halo / circumscribed halo
  - 08: obere Lichtsäule / upper Sun pillar
  - 09: untere Lichtsäule / lower Sun pillar
  - 10: komplette Lichtsäule / complete Sun pillar
  - 11: Zirkumzenitalbogen / circumzenithal arc
  - 12: 46°-Ring / 46° halo
  - 13: Horizontalkreis / parhelic circle
  - 14: linker Lowitzbogen / left Lowitz arcs
  - 15: rechter Lowitzbogen / right Lowitz arcs
  - 16: beide Lowitzbögen / both Lowitz arcs
  - 17: Gegensonne / anthelion
  - 18: linke 120°-Nebensonne / left 120° parhelion
  - 19: rechte 120°-Nebensonne / right 120° parhelion
  - 20: beide 120°-Nebensonnen / both 120° parhelia
  - 21: Supralateralbogen / supralateral arcs
  - 22: Infralateralbogen / infralateral arcs
  - 23: Zirkumhorizontalbogen / circumhorizontal arc
  - 24: linke 46°-Nebensonne / left 46° parhelion
  - 25: rechte 46°-Nebensonne / right 46° parhelion
  - 26: beide 46°-Nebensonnen / both 46° parhelia
  - 27: Parrybogen / Parry arcs
  - 28: 150-160°-(Liljequists) Nebensonnen / 150-160° (Liljequist's) parhelia
  - 29: 150-160°-(Liljequists) Unternebensonnen / 150-160° (Liljequist's) subparhelia
  - 30: Untergegensonne / subanthelion
  - 31: 9°-Ring oder Buijsens Halo / 9° or van Buijsen's halo
  - 32: 18°-Ring oder Rankins Halo / 18° or Rankin's halo
  - 33: 20°-Ring oder Burneys Halo / 20° or Burney's halo
  - 34: 23°-Ring oder Barkows Halo / 23° or Barkow's halo
  - 35: 24°-Ring oder Dutheils Halo / 24° or Dutheil's halo
  - 36: 35°-Ring oder Feuillees Halo / 35° or Feuillee's halo
  - 37: elliptische Ringe / elliptical halos
  - 38: Bottlinger Ringe / Bottlinger's halos
  - 39: Kerns Bogen / Kern's arc
  - 40: unterer Horizontalkreis / subparhelic circle
  - 41: linke 90°-Nebensonne / left 90° parhelion
  - 42: rechte 90°-Nebensonne / right 90° parhelion
  - 43: beide 90°-Nebensonnen / both 90° parhelia
  - 44: Untersonne / subsun
  - 45: linke 22°-Unternebensonne / left 22° subparhelion
  - 46: rechte 22°-Unternebensonne / right 22° subparhelion
  - 47: beide 22°-Unternebensonnen / both 22° subparhelia
  - 48: linker Unternebensonnenbogen / left subparhelic arc
  - 49: rechter Unternebensonnenbogen / right subparhelic arc
  - 50: beide Unternebensonnenbögen / both subparhelic arcs
  - 51: spindelförmiges Hellfeld / bright area between EE 05 and 27
  - 52: oberer 46°-Berührungsbogen / upper 46° tangent arc
  - 53: schiefer Bogen zur linken 120°-Nebensonne / oblique arc to the left 120° parhelion
  - 54: schiefer Bogen zur rechten 120°-Nebensonne / oblique arc to the right 120° parhelion
  - 55: schiefe Bögen zu beiden 120°-Nebensonnen / oblique arc to both 120° parhelia
  - 56: Wegeners Gegensonnenbogen / Wegener's anthelic arc
  - 57: Trickers Gegensonnenbogen / Tricker's anthelic arc
  - 58: Hastings Gegensonnenbogen / Hasting's anthelic arc
  - 59: Diffuse Gegensonnenbögen / Diffuse anthelic arcs
  - 60: Tapes Bogen / Tape's (46° Parry) arc
  - 61: Sonnenbogen / heliac arc
  - 62: Untersonnenbogen / subhelic arcs
  - 63: Untergegensonnenbogen / subanthelic arc
  - 64: 44°-Nebensonnen / 44° parhelia
  - 65: 66°-Nebensonnen / 66° parhelia
  - 66: 9°-parryförmige Bögen / 9° parroids
  - 67: 18°-Lateralbogen / 18° lateral arcs
  - 68: 20°-parryförmige Bögen / 20° parroids
  - 69: 23°-parryförmige Bögen / 23° parroids
  - 70: 24°-Lateralbögen / 24° lateral arcs
  - 71: 35°-Lateralbögen / 35° lateral arcs
  - 72: 9°-Berührungsbögen / 9° tangent arcs
  - 73: 24°-Berührungsbögen / 24° tangent arcs
  - 74: linke 120°-Unternebensonne / left 120° subparhelion
  - 75: rechte 120°-Unternebensonne / right 120° subparhelion
  - 76: beide 120°-Unternebensonnen / both 120° subparhelia
  - 77: Moilanenbogen / Moilanen arc
  - 78-98: [empty entries]
  - 99: unbekanntes oder nicht zuordbares Halo / unknown halo
- **Dependencies**: 
  - When E=8 or E=10: Requires HO (upper pillar height)
  - When E=9 or E=10: Requires HU (lower pillar height)
  - When E ∈ Sektor set AND V≠2: Requires sector information
- **Special Values**: None (required field)

### 14. H - Brightness (Helligkeit)
- **Pascal Variable**: `H` (ShortInt)
- **Position**: Character 23
- **Type**: Integer (1 digit)
- **Range**: 0-3
- **Values**: See ConH array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 0: sehr schwach / very faint
  - 1: schwach, wenig auffällig / faint, barely obvious
  - 2: hell, auffällig / bright, obvious
  - 3: sehr hell, sehr auffällig / very bright, very obvious
- **Dependencies**: None

### 15. F - Color (Farbe)
- **Pascal Variable**: `F` (ShortInt)
- **Position**: Character 24
- **Type**: Integer (1 digit)
- **Range**: 0-5
- **Values**: See ConF array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 0: weiß / white
  - 1: farbig / coloured
  - 2: Blauanteil besonders auffällig / blue content very obvious
  - 3: Gelbanteil besonders auffällig / yellow content very obvious
  - 4: Rotanteil besonders auffällig / red content very obvious
  - 5: Grünanteil besonders auffällig / green content very obvious
- **Dependencies**: None

### 16. V - Completeness (Vollständigkeit)
- **Pascal Variable**: `V` (ShortInt)
- **Position**: Character 25
- **Type**: Integer (1 digit)
- **Range**: 1-2
- **Values**: See ConV array
  - -1: keine Angabe / not observed [encoded as ` `]
  - 1: unvollständig / incomplete
  - 2: vollständig / complete
- **Dependencies**: 
  - When V=1 (incomplete): Sector information required if E ∈ Sektor set
  - When V=2 (complete): Sector information not applicable (all octants visible)
- **Special Values**: 

### 17. f - Weather Front (Witterungsfront)
- **Pascal Variable**: `ff` (ShortInt)
- **Position**: Character 26
- **Type**: Integer (1 digit)
- **Range**: 0-8
- **Values**: See Conff array
  - -1: keine Angabe / not observed [encoded as ` ` (space)]
  - 0: sonstige Front / other front
  - 1: Warmfront / warm front
  - 2: Kaltfront / cold front
  - 3: Okklusion / occlusion
  - 4: Trog(bereich/achse) / trough
  - 5: Wärmegewitter/Schauer / thunderstorm
  - 6: Konvergenzlinie / convergence
  - 7: Höhentief/Kaltlufttropfen / upper low
  - 8: Strahlstrom / jet stream
- **Dependencies**: None

### 18. zz - Precipitation (Niederschlag)
- **Pascal Variable**: `zz` (ShortInt)
- **Position**: Characters 27-28
- **Type**: Integer (2 digits)
- **Range**: 00-98, 99, or blank
- **Values**:
  - 00-98: Hours after observation until precipitation
  - 99: No precipitation occurred [encoded as `//`]
  - Blank: Not specified
- **Special Values**: 
  - `  ` (spaces) = Not specified (value -1)
- **Unit**: Hours

### 19. GG - Geographic Region (Beobachtungsgebiet)
- **Pascal Variable**: `G` (ShortInt)
- **Position**: Characters 29-30
- **Type**: Integer (2 digits)
- **Range**: 01-39 (excluding 12-15, 18)
- **Values**: See ConGG array
  - 01: Schleswig-Holstein/Mecklenburg-Vorpommern / Schleswig-Holstein/Mecklenburg-West Pomerania
  - 02: Niedersachsen/Bremen/Hamburg / Lower Saxony/Bremen/Hamburg
  - 03: Sachsen-Anhalt / Saxony-Anhalt
  - 04: Brandenburg/Berlin
  - 05: Nordrhein-Westfalen / North Rhine Westphalia
  - 06: Hessen / Hesse
  - 07: Thüringen / Thuringia
  - 08: Sachsen / Saxony
  - 09: Rheinland-Pfalz/Saarland / Rheinland-Pfalz/Saarland
  - 10: Baden-Württemberg / Baden Wurttemberg
  - 11: Bayern / Bavaria
  - 12: Deutschland / Germany [Note: may be invalid based on validation rules]
  - 13-15: [empty entries]
  - 16: Tschech./Slowak. Republik / Czech/Slovak Republics
  - 17: Österreich / Austria
  - 18: [empty entry]
  - 19: GUS
  - 20: Asien / Asia
  - 21: Polen / Poland
  - 22: Ungarn / Hungary
  - 23: Bulgarien / Bulgaria
  - 24: Rumänien / Romania
  - 25: Jugoslawien/Albanien / Yugoslavia/Albania
  - 26: Benelux-Staaten / Belgium/Holland/Luxembourg
  - 27: Schweiz / Switzerland
  - 28: Italien / Italy
  - 29: Frankreich / France
  - 30: Spanien/Portugal / Spain/Portugal
  - 31: Griechenland / Greece
  - 32: Dänemark / Denmark
  - 33: Norwegen/Schweden / Norway/Sweden
  - 34: Finnland / Finland
  - 35: Großbritannien/Irland / United Kingdom/Ireland
  - 36: Afrika / Africa
  - 37: Nord-/Südamerika / North-/South America
  - 38: Australien/Neuseeland/Ozeanien / Australia/New Sealand/Oceania
  - 39: Antarktis / Antarctica
- **Dependencies**: 
  - When g=0: Auto-filled from observer's GH field (see Observer Record Structure)
  - When g=2: Auto-filled from observer's GN field (see Observer Record Structure)
  - When g=1: Must be manually specified
- **Special Values**: None (required field)

### 20. 8HHHH - Sun Pillar Heights (Lichtsäulenhöhen)
- **Pascal Variables**: `HO` (upper pillar), `HU` (lower pillar) (both ShortInt)
- **Position**: Characters 31-35
- **Type**: Special format with prefix '8' + 4 digits
- **Components**:
  - Character 31: Always '8' (format marker)
  - HH (32-33): Upper pillar height (ho)
  - HH (34-35): Lower pillar height (hu)
- **Range**: 
  - -1: keine Angabe / not observed [encoded as ` ` (space)]
  - 0: not applicable [encoded as `//` (space)]
  - 01-90 degrees for each height
- **Dependencies**:
  - **When E=8** (upper pillar only):
    - Format: `8HH//` (ho specified, hu not applicable)
  - **When E=9** (lower pillar only):
    - Format: `8//HH` (ho not applicable, hu specified)
  - **When E=10** (both pillars):
    - Format: `8HHHH` (both ho and hu specified)
  - **When E ∉ {8,9,10}**:
    - Format: `/////` (all blank)

### 21. Sektoren - Sectors
- **Position**: Characters 36-50 (15 characters)
- **Type**: String (sector notation)
- **Format**: Circle divided into 8 octants (a-h)
  - Single octant: `a` (only octant a visible)
  - Adjacent octants: `a-b-c` (each visible octant connected by hyphen)
  - Non-adjacent octants: `a-b-c e-f` (groups separated by space)
  - Example: `a-b-c e` means octants a, b, c are visible, plus octant e
- **Octant Labels**: a, b, c, d, e, f, g, h (8 octants around the circle)
- **Dependencies**: 
  - Only applicable when V=1 (unvollständig/incomplete) AND E ∈ Sektor set [1, 7, 12, 31, 32, 33, 34, 35, 36, 40]:
    - 01: 22°-Ring
    - 07: umschriebener Halo
    - 12: 46°-Ring
    - 31: 9°-Ring oder Buijsens Halo
    - 32: 18°-Ring oder Rankins Halo
    - 33: 20°-Ring oder Burneys Halo
    - 34: 23°-Ring oder Barkows Halo
    - 35: 24°-Ring oder Dutheils Halo
    - 36: 35°-Ring oder Feuillees Halo
    - 40: unterer Horizontalkreis
  - NOT relevant when V=2 (vollständig/complete): all octants visible by definition
- **Special Values**: 
  - All spaces = No sector information
- **Length**: Fixed 15 characters (padded with spaces)

### 22. Bemerkungen - Remarks
- **Position**: Characters 51+ (variable length)
- **Type**: String (free text)
- **Range**: 0-100+ characters (string100 type)
- **Dependencies**: 
  - Length stored in lbem field
  - Display format changes when lbem > 50
- **Special Values**: Empty string allowed
- **Notes**: 
  - Can contain any text
  - Used for additional observation details

---

## Field Dependencies Summary

### Dependency Checking Rules

**Trigger Fields**: Dependencies are only evaluated when these fields change:
- **O** (Object)
- **d** (Cirrus Density) 
- **N** (Cloud Cover)
- **KK** (Observer)
- **g** (Location Type)
- **MM** (Month)
- **EE** (Phenomenon Type)

Dependencies are also applied when setting initial values for new observations.

**Forward-Only Dependencies**: Fields can only affect subsequent fields in the input flow, never previous fields. This prevents circular dependencies and simplifies validation logic, especially for numeric keyboard entry mode.

**Recursive Check**: When one field triggers the change of another field, then the dependency check of that field has to be executed as well.
### Dependency Rules (Forward Direction Only, recursive Check)

#### 1. O (Object) → d, N, C, c

- **O = -1** (not set):
  - d = -1 (not set)

- **O = 0-4** (Sun, Moon, Planet, Star):
  - d = -1, 0-2, 4-7 (all cirrus densities available)

- **O = 5** (Earthbound light source):
  - d = -1, 4-7 (only non-cirrus halo sources)
  - N = -1 (not set)
  - C = -1 (not set)
  - c = -1 (not set)

#### 2. d (Cirrus Density) → N, C, c

- **d = -1** (not observed):
  - N = -1 (not set)

- **d = 0-2** (thin cirrus):
  - N = -1, 1-9 (not 0 - some cloud cover required)
  - C = -1, 1-7 (not 0 - cirrus present)
  - c = -1, 0-9 (all low cloud options)

- **d = 4-7** (thick cirrus or non-cirrus):
  - N = -1 (not set)

#### 3. N (Cloud Cover) → C, c

- **N = -1** (not observed):
  - C = -1 (not set)
  - c = -1 (not set)

- **N = 0** (clear sky):
  - C = 0 (no cirrus)
  - c = -1 (not set)

- **N = 1-8** (some clouds):
  - C = -1, 1-7 (not 0)
  - c = -1, 0-9 (all options)

- **N = 9** (overcast):
  - C = -1, 0-7 (all options)
  - c = -1, 1-9 (not 0)

#### 4. KK (Observer), JJ (Year) and MM ( Month) → g

- **KK = -1 or JJ = -1 or MM = -1** (not set):
  - g = -1 (not set)

- **KK > -1 and JJ > -1 and MM > -1** (all valid values):
  - g = -1, 0, 1, 2 (all values) if the observer was active at that time
  - g = -1 (not set) if the observer was inactive at that time

#### 5. g (Location Type) → GG

- **g = -1** (not set):
  - GG = -1  (not set)

- **g = 0** (Hauptbeobachtungsort):
  - GG = Observer's GH (auto-filled from observer record)

- **g = 1** (Auswärtsbeobachtung):
  - GG = -1, 1-11, 16-17, 19-39 (all valid geographic regions)

- **g = 2** (Nebenbeobachtungsort):
  - GG = Observer's GN (auto-filled from observer record)

#### 6. MM (Month) → TT

- **MM = -1** (not set):
  - TT = -1 (not set)

- **MM = 1, 3, 5, 7, 8, 10, 12** (31-day months):
  - TT = 1-31 (31 days)

- **MM = 2** (February):
  - TT = 1-28 (or 1-29 for leap years)

- **MM = 4, 6, 9, 11** (30-day months):
  - TT = 1-30 (30 days)

#### 7. EE (Phenomenon) → HO, HU

- **EE = 8** (Obere Lichtsäule):
  - HO = -1, 1-90 (height required)
  - HU = 0 (not applicable)

- **EE = 9** (Untere Lichtsäule):
  - HO = 0 (not applicable)
  - HU = -1, 1-90 (height required)

- **EE = 10** (both light pillars):
  - HO = -1, 1-90 (height required)
  - HU = -1, 1-90 (height required)

- **EE = -1 and all other values**:
  - HO = 0 (not applicable)
  - HU = 0 (not applicable)

#### 8. EE (Phenomenon) and V (Completeness→ Sectors

- **EE = -1 and not circular halo** (not 1, 7, 12, 31, 32, 33, 34, 35, 36, 40):
  - Sectors = inactive (not applicable)

- **EE = circular halo and V = 0, 2** (1, 7, 12, 31, 32, 33, 34, 35, 36, 40):
  - Sectors = inactive (not applicable)

- **EE = circular halo and V = 0, 2** (1, 7, 12, 31, 32, 33, 34, 35, 36, 40):
  - Sectors = active (required)

---

## Observer Record Structure (Beobachter)

The observer database stores information about each registered observer. Each observer record contains the following fields:

### Observer Fields:

1. **V - Version**
   - **Type**: Byte
   - **Purpose**: Record version number

2. **K - Observer Number (Kennummer)**
   - **Type**: Byte
   - **Range**: 1-160 (MaxKenn)
   - **Purpose**: Unique identifier for each observer
   - **Note**: Can include letter prefix (A-F) from KennBuch set

3. **VName - First Name (Vorname)**
   - **Type**: string15
   - **Length**: Up to 15 characters
   - **Purpose**: Observer's first name

4. **NName - Last Name (Nachname)**
   - **Type**: string15
   - **Length**: Up to 15 characters
   - **Purpose**: Observer's last name

5. **HbOrt - Primary Observation Location (Hauptbeobachtungsort)**
   - **Type**: string20
   - **Length**: Up to 20 characters
   - **Purpose**: Name/description of primary observation site
   - **Usage**: Used when g=0 in observation records

6. **NbOrt - Secondary Observation Location (Nebenbeobachtungsort)**
   - **Type**: string20
   - **Length**: Up to 20 characters
   - **Purpose**: Name/description of secondary observation site
   - **Usage**: Used when g=2 in observation records

7. **GH - Geographic Region for Primary Location**
   - **Type**: ShortInt
   - **Range**: 01-39 (excluding 12-15, 18)
   - **Purpose**: Region code for primary location
   - **Values**: See Field 19 (GG) - identical ConG array values
   - **Usage**: Auto-filled as GG when g=0

8. **GN - Geographic Region for Secondary Location**
   - **Type**: ShortInt
   - **Range**: 01-39 (excluding 12-15, 18)
   - **Purpose**: Region code for secondary location
   - **Values**: See Field 19 (GG) - identical ConG array values
   - **Usage**: Auto-filled as GG when g=2

9. **HLG, HLM - Primary Location Longitude**
   - **Type**: Integer (both)
   - **Components**:
     - HLG: Longitude degrees
     - HLM: Longitude minutes
   - **Purpose**: Geographic longitude of primary observation site

10. **HBG, HBM - Primary Location Latitude**
    - **Type**: Integer (both)
    - **Components**:
      - HBG: Latitude degrees
      - HBM: Latitude minutes
    - **Purpose**: Geographic latitude of primary observation site

11. **HNS - Primary Location N/S Indicator**
    - **Type**: Char
    - **Values**: 'N' (North) or 'S' (South)
    - **Purpose**: Hemisphere indicator for primary location latitude

12. **HOW - Primary Location E/W Indicator**
    - **Type**: Char
    - **Values**: 'O' (Ost/East) or 'W' (West)
    - **Purpose**: Hemisphere indicator for primary location longitude

13. **NLG, NLM - Secondary Location Longitude**
    - **Type**: Integer (both)
    - **Components**:
      - NLG: Longitude degrees
      - NLM: Longitude minutes
    - **Purpose**: Geographic longitude of secondary observation site

14. **NBG, NBM - Secondary Location Latitude**
    - **Type**: Integer (both)
    - **Components**:
      - NBG: Latitude degrees
      - NBM: Latitude minutes
    - **Purpose**: Geographic latitude of secondary observation site

15. **NNS - Secondary Location N/S Indicator**
    - **Type**: Char
    - **Values**: 'N' (North) or 'S' (South)
    - **Purpose**: Hemisphere indicator for secondary location latitude

16. **NOW - Secondary Location E/W Indicator**
    - **Type**: Char
    - **Values**: 'O' (Ost/East) or 'W' (West)
    - **Purpose**: Hemisphere indicator for secondary location longitude

17. **seit - Observing Site Since (Valid From)**
    - **Type**: Integer
    - **Encoding**: month + 13 × year
      - seit MOD 13 = month (1-12)
      - seit DIV 13 = year (2-digit)
      - Year >= 50: 19xx, Year < 50: 20xx
    - **Purpose**: Indicates from which month/year this observer record is valid
    - **Note**: Multiple records can exist for the same observer (same K) with different seit values. Each record is valid from its seit date until the seit date of the next record for that observer.

18. **aktiv - Active Status**
    - **Type**: Boolean
    - **Values**: True (active) / False (inactive)
    - **Purpose**: Indicates whether observer was active during the validity period of this record

### Observer Records:
- **Multiple Records per Observer**: An observer (identified by K) can have multiple records with different seit values
- **Validity Period**: Each record is valid from its seit date until the seit date of the next record for the same observer
- **Historical Tracking**: This allows tracking changes in observation locations and active status over time

### Observer Array:
- **Type**: BeobArray = ARRAY [1..MaxKenn] OF Beobachter
- **Max Size**: 160 observers (MaxKenn = 160)
- **Storage**: Binary file (BrFile = FILE OF Beobachter)
- **File Sorting**: Observer records are always sorted by:
  1. Observer ID (K) - ascending
  2. Valid from date (seit) - ascending (with proper 19xx/20xx century handling)
  - Sort criteria: `(hilf.K > Knr) OR ((hilf.K = Knr) AND (seit1 < seit2))`

---

## File Organization

### Observation File Sorting
Observation records in .HAL files are always maintained in sorted order using the following sort criteria (implemented in `spaeter` function):

1. **Year (J)** - ascending (with century handling: years ≥50 = 19xx, years <50 = 20xx)
2. **Month (M)** - ascending
3. **Day (T)** - ascending
4. **Hour (ZS)** - ascending
5. **Minute (ZM)** - ascending
6. **Observer ID (K)** - ascending
7. **Halo Type (E)** - ascending
8. **Observation Location (gg)** - ascending

**Sort Function Logic**: The `spaeter(a,b)` function returns:
- `-1` if record `a` comes before `b`
- `0` if records are identical (same date/time/observer/halo/location)
- `1` if record `a` comes after `b`

### Observer File Sorting
Observer records in Halo.BEO file are always maintained in sorted order:

1. **Observer ID (K)** - ascending
2. **Valid from date (seit)** - ascending (with century handling)

This sorting ensures efficient sequential access and proper historical tracking of observer data changes.

---

## Notes

- The format is fixed-width with some variable-length fields at the end
- Character encoding is ASCII/ANSI
- Leading zeros are required for single-digit values
- The system uses 2-digit years (Y2K handling needed)
- Special separator characters: `/` (not specified), ` ` (space, not applicable)
- The format optimizes for manual data entry and visual scanning

---

## Version History

- **Version 1.0**: Initial documentation based on H_BEOBNG.PAS analysis
- Date: 2024-12-23
