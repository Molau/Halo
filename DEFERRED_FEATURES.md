# Deferred Features and Functions
# Deferred Features and Functions

This document tracks all features and functions that were skipped during initial implementation and need to be added later.

## Status Legend
- ⏳ **Deferred**: Explicitly postponed for later implementation
- ⏭️ **Skipped**: Not required or replaced by modern approach
- 🔄 **In Progress**: Currently being implemented
- ✅ **Complete**: Fully implemented and tested

---

## 1. Datei Menu - File Operations

### ⏳ Anpassen (Format Conversion)
- **Purpose**: Convert between different file formats or versions
- **Source**: Menu item "Anpassen"
- **Complexity**: Medium
- **Notes**: Format conversion between .HAL binary and CSV, or version upgrades

### ⏳ Selektieren (Filter and Remove)
- **Purpose**: Filter observations by criteria and remove unmatched entries
- **Source**: Menu item "Selektieren"
- **Complexity**: Medium
- **Implementation notes**:
  - Apply filter criteria (date range, observer, halo type, etc.)
  - Remove observations that don't match
  - Save filtered result to file
  - Show count of removed vs. retained observations

### ⏳ Verbinden (Merge Files)
- **Purpose**: Merge multiple observation files with duplicate detection
- **Source**: Menu item "Verbinden"
- **Complexity**: High
- **Implementation notes**:
  - Load two or more files
  - Detect duplicates by date/time/observer/halo type
  - Sort chronologically
  - Save merged result
  - Report duplicate count and merge statistics

### ⏭️ Übertragen (Transfer)
- **Purpose**: Transfer data between different systems
- **Source**: Menu item "Übertragen"
- **Status**: User confirmed "not required anymore"
- **Notes**: Obsolete functionality, not needed in modern web application

### ⏳ Exportieren (CSV Export with Options)
- **Purpose**: Export observations to CSV with special formatting options
- **Source**: Menu item "Exportieren"
- **Complexity**: Medium
- **Implementation notes**:
  - User confirmed: "will do that later"
  - Column selection (choose which fields to export)
  - Date range filtering
  - Observer filtering
  - Custom field separators
  - Header row options
  - Export format customization

### ⏭️ Verzeichniswechsel (Directory Change)
- **Purpose**: Change working directory for file operations
- **Source**: Menu item "Verzeichniswechsel"
- **Status**: Replaced by modern file browser dialog
- **Notes**: Modern file dialogs allow directory navigation, separate function not needed

---

## 2. Display Mode - Detailed View

### ⏳ Langausgabe (Detailed Display)
- **Purpose**: Display observations in detailed format when Eingabeart='M'
- **Source**: H_BEOBNG.PAS lines 25-200
- **Complexity**: Medium
- **Implementation notes**:
  - Currently only compact view (kurzausgabe) is implemented
  - Need to decode all fields using i18n resources
  - Show full field names and descriptions
  - Format: "Beobachter: [name]", "Datum: [T.M.J]", "Haloart: [EE - description]"
  - Navigate one observation at a time (prev/next buttons)
  - Use ConE, ConG, ConH, ConF arrays for decoding
  - Display sectors as text, not encoded numbers

---

## 3. Beobachtungen Menu - Observation Management

### ⏳ Hinzufügen (Add New Observation)
- **Purpose**: Add new observation entry
- **Source**: Menu "Beobachtungen → Hinzufügen", H_EING.PAS
- **Complexity**: High
- **Implementation notes**:
  - Create form dialog matching Pascal input prompts
  - Support both Eingabeart modes:
    - M (Menüeingaben): Form-based entry with dropdowns/selections
    - Z (Zahleneingaben): Compact single-line entry
  - Validate all fields (date, time, observer, halo type, etc.)
  - Add to OBSERVATIONS array
  - Set DIRTY=True
  - Auto-increment observation number

### ⏳ Verändern (Edit Observation)
- **Purpose**: Modify existing observation
- **Source**: Menu "Beobachtungen → Verändern"
- **Complexity**: High
- **Implementation notes**:
  - Select observation to edit (by number or from list)
  - Pre-fill form with current values
  - Support both Eingabeart modes
  - Validate changes
  - Update OBSERVATIONS array
  - Set DIRTY=True

### ⏳ Löschen (Delete Observation)
- **Purpose**: Remove observation from dataset
- **Source**: Menu "Beobachtungen → Löschen"
- **Complexity**: Low
- **Implementation notes**:
  - Select observation to delete
  - Show confirmation dialog with observation details
  - Remove from OBSERVATIONS array
  - Set DIRTY=True
  - Update observation numbers

---

## 4. Beobachter Menu - Observer Management

### ⏳ Anzeigen (List Observers)
- **Purpose**: Display all registered observers
- **Source**: Menu "Beobachter → Anzeigen", H_BEOBER.PAS
- **Complexity**: Medium
- **Implementation notes**:
  - Load observers from configuration/database
  - Display: code, name, location, coordinates
  - Sort by code or name
  - Show statistics (number of observations per observer)

### ⏳ Hinzufügen (Add Observer)
- **Purpose**: Register new observer
- **Source**: Menu "Beobachter → Hinzufügen", H_BEOBER.PAS
- **Complexity**: Medium
- **Implementation notes**:
  - Input form: observer code (2 chars), full name, location, coordinates
  - Validate unique observer code
  - Save to observer database/file
  - Update observer list

### ⏳ Verändern (Edit Observer)
- **Purpose**: Modify observer information
- **Source**: Menu "Beobachter → Verändern", H_BEOBER.PAS
- **Complexity**: Medium
- **Implementation notes**:
  - Select observer by code
  - Pre-fill form with current data
  - Allow editing name, location, coordinates
  - Observer code should remain immutable (or warn about impacts)
  - Save changes

### ⏳ Löschen (Delete Observer)
- **Purpose**: Remove observer from database
- **Source**: Menu "Beobachter → Löschen", H_BEOBER.PAS
- **Complexity**: Medium
- **Implementation notes**:
  - Select observer by code
  - Check for observations by this observer
  - Warn if observations exist
  - Confirmation dialog
  - Remove from observer database

---

## 5. Auswertung Menu - Analysis Features

### ⏳ Ein Parameter (Single Variable Analysis)
- **Purpose**: Analyze distribution of single variable (e.g., halo types over time)
- **Source**: Menu "Auswertung → ein Parameter"
- **Complexity**: High
- **Implementation notes**:
  - Select variable to analyze (halo type, observer, month, year, etc.)
  - Generate frequency distribution
  - Display bar chart/histogram
  - Export results as table or chart
  - Statistical summary (mean, median, mode, std dev)

### ⏳ Zwei Parameter (Two Variable Analysis)
- **Purpose**: Correlation analysis between two variables
- **Source**: Menu "Auswertung → zwei Parameter"
- **Complexity**: High
- **Implementation notes**:
  - Select two variables (e.g., halo type vs. month, observer vs. region)
  - Generate cross-tabulation
  - Display scatter plot or heatmap
  - Calculate correlation coefficient
  - Export results

### ⏳ Laden (Load Analysis Configuration)
- **Purpose**: Load saved analysis parameters
- **Source**: Menu "Auswertung → Laden"
- **Complexity**: Low
- **Implementation notes**:
  - Save/load analysis configurations (variables, filters, chart settings)
  - Quick replay of previous analyses
  - Configuration file format (JSON)

---

## 6. Ausgabe Menu - Output/Reports

### ⏳ Monatsmeldung (Monthly Report)
- **Purpose**: Generate standardized monthly observation report
- **Source**: Menu "Ausgabe → Monatsmeldung"
- **Complexity**: Medium
- **Implementation notes**:
  - Select month and year
  - Format observations in standard report layout
  - Include observer information
  - Export as text or PDF
  - Follow official reporting format

### ⏳ Monatsstatistik (Monthly Statistics)
- **Purpose**: Statistical summary for a specific month
- **Source**: Menu "Ausgabe → Monatsstatistik"
- **Complexity**: Medium
- **Implementation notes**:
  - Count observations by halo type
  - Group by observer
  - Show daily distribution
  - Compare with previous months
  - Generate charts

### ⏳ Jahresstatistik (Yearly Statistics)
- **Purpose**: Annual summary of observations
- **Source**: Menu "Ausgabe → Jahresstatistik"
- **Complexity**: Medium
- **Implementation notes**:
  - Year-over-year comparison
  - Seasonal patterns
  - Observer contributions
  - Halo type distribution
  - Export as report with charts

---

## 7. Service Layer Components

### ⏳ H_ROUT.PAS - Utility Functions
- **Purpose**: Core utility functions for calculations and validation
- **Source**: QUELLEN/H_ROUT.PAS
- **Complexity**: High
- **Components to implement**:
  - `sonnepos()`: Solar position calculations (azimuth, elevation)
  - `juldat()`: Julian date conversions
  - `datum()`: Date validation and formatting
  - `zeit()`: Time parsing and validation
  - `winkel()`: Angle calculations for halo geometry
  - `checkcode()`: Observer code validation
  - `checkbeob()`: Observation data validation
  - String manipulation utilities

### ⏳ H_BEOBER.PAS - Observer Management Service
- **Purpose**: Backend service for observer data management
- **Source**: QUELLEN/H_BEOBER.PAS
- **Complexity**: Medium
- **Components to implement**:
  - Observer database loading/saving
  - CRUD operations for observers
  - Observer lookup by code
  - Location/coordinate management
  - Observer statistics

---

## 8. Additional Pascal Modules to Review

### ⏳ H_VERS.PAS - Version Management
- **Purpose**: Version checking and compatibility
- **Source**: QUELLEN/H_VERS.PAS
- **Notes**: May need adaptation for web application

### ⏳ H_SPR.PAS - Language/Strings
- **Purpose**: Additional string resources
- **Source**: QUELLEN/H_SPR.PAS
- **Status**: Partially covered by current i18n system
- **Notes**: Review for any missing translations

### ⏳ H_FILES.PAS - Extended File Operations
- **Purpose**: Advanced file handling beyond basic load/save
- **Source**: QUELLEN/H_FILES.PAS
- **Notes**: Review for additional file operations

---

## Implementation Priority (Recommended Order)

### Phase 1: Core Functionality (High Priority)
1. ✅ Langausgabe (detailed view) - Needed for complete display functionality
2. Hinzufügen/Verändern/Löschen (observation CRUD) - Core data management
3. H_ROUT.PAS utilities - Required by many other features

### Phase 2: Data Management (Medium Priority)
4. Observer management (Beobachter menu)
5. Selektieren (filter operations)
6. Verbinden (merge files)
7. Exportieren (advanced export)

### Phase 3: Analysis & Reports (Lower Priority)
8. Monthly/yearly statistics
9. Single parameter analysis
10. Two parameter analysis
11. Report generation

### Phase 4: Polish & Optional
12. Format conversion (Anpassen)
13. Advanced configuration options
14. Additional utilities

---

## Notes

- All API endpoints should use **English names** (not German)
- Maintain **exact Pascal behavior** where specified by user
- Preserve **field naming** from original halo standard
- Use **i18n resources** for display text (support DE/EN)
- Follow **layered architecture**: models → services → api → web
- Implement **proper validation** for all user inputs
- Add **confirmation dialogs** for destructive operations
- Maintain **DIRTY flag** for unsaved changes
- Use **session state** for multi-step operations

---

*Last Updated: December 22, 2025*
*Maintained alongside HALOpy development*
