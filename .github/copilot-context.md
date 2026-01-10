# HALOpy Migration Project - Architecture & Decisions

> **📋 Documentation Type**: IMPLEMENTATION DECISIONS (Controlled)  
> **Status**: Requires explicit approval before adding new decisions  
> **Authority**: Project team decisions during migration  
> **Usage**: Reference for understanding implementation choices and rationale  
> **Process**: All new decisions must use Change Request Template and receive approval  
> **Note**: Previously named ARCHITECTURE_DECISIONS.md, renamed to copilot-context.md for GitHub Copilot integration

---

## Project Overview

**Source System**: HALO - DOS/Pascal halo observation recording system  
**Target System**: HALOpy - Python web application  
**Migration Start**: December 2025  
**Primary Goal**: Modernize the system while preserving data format, functionality, and user experience

**Decision: Web Application vs Desktop Client**  
**Rationale**: 
- No compilation needed - Python runs directly
- Cross-platform by design - works on any device with a browser
- Easy deployment - local server or cloud hosting
- Modern technology stack - easier to maintain and extend
- Better for collaboration - potential for shared data access

---

## Core Principles

### 1. Observation Record Format (HALO Key)
- **Decision**: ✓ Preserve standardized observation record format exactly
- **Format**: `KKOJJ MMTTg ZZZZd DDNCc EEHFV fzzGG 8HHHH Sektoren Bemerkungen`
- **Rationale**: 
  - Standardized format defined independently of HALO program
  - Used by observation community for decades
  - Cannot be changed - this is a standard, not a design decision
- **Status**: ✓ Fixed (not changeable)
- **Documentation**: See [HALO_DATA_FORMAT.md](HALO_DATA_FORMAT.md)

### 2. File Storage Format
- **Decision**: OPEN - Binary (.HAL, .BEO) vs. CSV format
- **Current Situation**: 
  - Using CSV files as temporary workaround
  - Original software supports CSV export for observations (.HAL files)
  - Observer files (.BEO) only exist in binary format - CSV conversion pending
- **Original Format**: 
  - Binary files with compression algorithm
  - Reason: Limited disk space (floppy disks) - no longer relevant
  - Proprietary to HALO program - can be changed
- **Options**:
  - Option A: Keep original binary format WITH compression (as-is)
  - Option B: Use CSV as primary format (observations already supported, observers need conversion)
- **Note**: Compression is integral to the binary format and cannot be removed - it's all or nothing
- **Requirements if choosing CSV**:
  - Must read and interpret CSV format exported by original Pascal program
  - Ensure compatibility with existing CSV exports from HALO.EXE
  - Users can convert their binary files using original Pascal program's CSV export function
- **Trade-offs**:
  - Binary: Compact, preserves original format
  - CSV: Human-readable, easier to work with, already exported by original software
- **Technical Note for CSV**: 
  - Remark field (Bemerkungen) may contain commas
  - Each field in HALO key has fixed length (positions 1-50)
  - Original CSV export preserves field positions
  - Remark field starts at position 51, allowing proper parsing even with embedded commas
  - Must escape/handle commas in remark field appropriately
- **Status**: Decision pending
- **Documentation**: See [HALO_DATA_FORMAT.md](HALO_DATA_FORMAT.md) for record structure (independent of storage format)

### 3. Strict Fidelity to Original
- **Decision**: Maintain original program structure, logic, and user interface as closely as possible
- **Rationale**: 
  - Preserve proven workflow developed over decades
  - Minimize learning curve for existing users
  - Ensure behavioral compatibility
- **Status**: Active principle
- **Applies to**:
  - Menu structure and functions (30 years of user familiarity)
  - Display formats
  - Error messages
  - All texts and translations (use original texts exactly, no rephrasing or independent translation)
- **Critical**: Do NOT rephrase, translate, or adapt any text unless explicitly approved. All texts must come directly from the original Pascal program source.
- **Note**: Data validation rules, field dependencies, and sort orders are NOT design decisions - they are defined by the observation data standard itself and cannot be changed

### 4. Controlled Evolution
- **Decision**: No function omission or new features without explicit approval
- **Rationale**: Prevent scope creep and maintain focus on faithful migration
- **Process**: All changes must be:
  1. Proposed with rationale
  2. Explicitly approved
  3. Documented in this file
- **Status**: Active principle

### 5. Bilingual Support (DE/EN)
- **Decision**: Full bilingual support using i18n framework
- **Rationale**: Original system is bilingual; users span German and English-speaking regions
- **Requirements**:
  - All UI text must exist in both languages
  - Language switching must be possible at any time
  - Use original German and English texts from Pascal source
- **Status**: ✓ Implemented
- **Implementation**: JSON resource files in `resources/` directory

### 5a. Internationalization (i18n) Scope - Decision #017
- **Date**: 2026-01-10
- **Status**: ✓ Approved
- **Principle**: Put in i18n ONLY text that would need translation for a new language
- **What MUST be in i18n** (translatable UI text):
  - User-visible labels, messages, titles, prompts
  - Error messages, warnings, confirmations
  - Table headers, column names (when user-facing)
  - Button labels, menu items
  - Help text, descriptions, explanations
  - Any text that would change when adding French, Spanish, etc.
- **What CAN stay hardcoded** (non-translatable):
  - Technical data format strings: `KKOJJ MMTTg`, `ZZZZd DDNCc`, etc.
  - Pseudographic/box-drawing table structures: `║`, `╔`, `═`, etc.
  - Technical identifiers and codes
  - Field position markers, layout characters
  - Anything that doesn't change meaning in a new language
- **Fail Fast Rule** (Decision #015):
  - No fallbacks: `i18n?.field || 'default'` is **FORBIDDEN**
  - All i18n fields accessed directly: `i18n.field`
  - Missing i18n keys cause immediate errors (intended behavior)
  - This prevents silent failures and ensures consistency
- **Examples**:
  - ✓ Translatable → i18n: "Tag", "Sonne", "Monatsmeldung", "Fehler beim Laden"
  - ✓ Hardcodable: `║ KKOJJ MMTTg ║`, `╠═══╬═══╣`, `KKOJJ MMTTg ZZZZd DDNCc`
  - ✗ Wrong: `Tag` hardcoded in JavaScript for HTML output
  - ✗ Wrong: `i18n.months || ['Jan', 'Feb', ...]` fallback pattern
- **Implementation Guidelines**:
  - Check if text would be different in another language
  - If yes → must be i18n key
  - If no → can remain hardcoded
  - Always access i18n without optional chaining or fallbacks

### 6. Code Reuse and DRY Principle
- **Decision**: Always reuse existing code, data structures, and patterns instead of duplicating
- **Rationale**: 
  - Reduces maintenance burden - changes in one place propagate everywhere
  - Prevents inconsistencies between different parts of the codebase
  - Ensures uniform behavior across features
  - Easier to understand and modify
- **Requirements**:
  - Before implementing any feature, search for existing similar code
  - Reuse existing:
    - **Alerts/dialogs**: Use established warning/error patterns (e.g., "no data loaded" modal)
    - **Constants**: Use i18n strings for geographic regions, halo types, months, etc.
    - **Functions**: Observer filters, data validation, formatting functions
    - **UI components**: Bootstrap modals, buttons, input patterns
    - **API patterns**: Response formats, error handling, parameter validation
- **Examples**:
  - Geographic regions: Use `i18n.geographic_regions` instead of hardcoding region arrays
  - Warning dialogs: Use `showWarningModal()` pattern from existing pages
  - Observer selection: Reuse observer dropdown and filter logic
  - Date validation: Reuse existing month/year validation functions
- **Status**: Active principle
- **Anti-patterns to avoid**:
  - Hardcoding data that exists in i18n files
  - Reimplementing dialogs/modals with different styles
  - Creating new validation logic for data already validated elsewhere
  - Writing custom formatters for standardized fields

### 7. No Fallback Values - Fail Fast
- **Decision #015**: Never use fallback values or default data - fail explicitly when data is missing
- **Date**: 2026-01-04
- **Status**: ✓ Approved
- **Rationale**:
  - Makes problems visible immediately rather than masking them
  - Easier to debug - errors point directly to missing data
  - Prevents silent failures that can go unnoticed for long periods
  - Forces proper implementation of i18n and data structures
- **Core Rules**:
  1. ✗ **NEVER** use optional chaining with fallbacks: `i18n?.months || ['default']`
  2. ✓ **ALWAYS** access data directly: `i18n.months`
  3. ✗ **NEVER** provide fallback strings in templates or JavaScript
  4. ✓ **ALWAYS** let code fail if required data is missing
- **Examples**:
  - ✗ Wrong: `const months = i18n?.months || ['Januar', 'Februar', ...]`
  - ✓ Correct: `const months = i18n.months`
  - ✗ Wrong: `i18n.dialogs?.no_data?.message || 'No data'`
  - ✓ Correct: `i18n.dialogs.no_data.message`
- **Benefits**:
  - Missing i18n keys cause immediate errors in development
  - Missing API fields cause immediate errors that get fixed
  - No silent degradation of functionality
  - Code is cleaner without fallback logic everywhere
- **Status**: Active principle

---

## Technology Stack Decisions

### Programming Language
- **Decision**: Python 3.x
- **Rationale**: 
  - Modern, maintainable
  - Excellent library support
  - Cross-platform
- **Status**: ✓ Approved

### Application Architecture
- **Decision**: Web application (Flask framework)
- **Rationale**:
  - Cross-platform compatibility
  - No installation required
  - Modern UI possibilities while maintaining familiar workflow
  - Easier deployment and updates
- **Status**: ✓ Approved

### Python Environment Management
- **Decision #012**: Do not use virtual environments (venv) for HALOpy
- **Date**: 2025-12-25
- **Status**: ✓ Approved
- **Rationale**:
  - Team decision: simplify setup for contributors and target machines
  - Aligns with original HALO's minimal installation philosophy
  - Avoids environment confusion for non-developer users in labs
- **Implications**:
  - Installation instructions use system Python directly
  - Dependencies installed with `pip install -r requirements.txt` on the system
  - Scripts, docs, and tooling must not assume an activated venv
- **Trade-offs**:
  - ✓ Simpler onboarding for users without Python tooling experience
  - ✗ Less isolation; be mindful of system-wide package versions
- **Operational Rules**:
  1. ✓ Documentation MUST NOT include venv creation/activation steps
  2. ✓ CI/CD and deploy scripts MUST use system Python or containerized runtimes
  3. ✗ Do NOT add `pyproject.toml`/`pipenv`/`poetry` environment activation requirements without a new approved decision
  4. ✓ If isolation is needed for a specific deployment, use containers (separate decision) rather than venv

### Binary File I/O
- **Decision**: CONDITIONAL - depends on File Storage Format decision (Principle #2)
- **If Binary Format chosen**: Python `struct` module for binary file operations
- **If CSV Format chosen**: Standard CSV parsing, no binary I/O needed
- **Rationale**: Binary I/O only required if keeping original compressed binary format
- **Status**: Pending (awaiting File Storage Format decision)
- **Location**: `src/halo/io/` module
- **Note**: Some binary I/O implementation exists for analysis/testing purposes

### API Design Principles

#### Decision #014: REST API Parameter Passing
- **Decision**: All API parameters must be passed in the request body, not in the URL path
- **Date**: 2025-12-30
- **Status**: ✓ Approved - enforced after URL encoding issues with site management
- **Rationale**:
  - Prevents URL encoding issues (e.g., slash in "04/26" interpreted as path separator)
  - More RESTful and consistent API design
  - Easier to extend with additional parameters
  - Cleaner code without encodeURIComponent() workarounds
  - Matches industry best practices for REST APIs
- **Core Rules**:
  1. ✓ **Resource identifiers** go in URL path (e.g., `/api/observers/44`)
  2. ✓ **All other parameters** go in request body as JSON
  3. ✓ **PUT/DELETE**: Include identifying parameters in body, not URL
  4. ✗ **NEVER** pass data parameters in URL query strings or path segments
- **Examples**:
  - ✓ **Correct**: `PUT /api/observers/44/sites` with body `{"originalSeit": "04/26", "seit_month": 5, ...}`
  - ✗ **Wrong**: `PUT /api/observers/44/sites/04/26` (requires URL encoding)
  - ✓ **Correct**: `DELETE /api/observers/44/sites` with body `{"seit": "04/26"}`
  - ✗ **Wrong**: `DELETE /api/observers/44/sites/04/26` (requires URL encoding)
  - ✓ **Correct**: `PUT /api/observers/44` with body `{"VName": "...", "NName": "..."}`
- **Exceptions**: 
  - Resource IDs that are simple integers or alphanumeric codes (e.g., observer KK)
  - Pagination parameters for GET requests (`?limit=100&offset=0`)
- **Related**: This decision complements #013 (API Endpoint Usage Policy)

#### Decision #013: API Endpoint Usage Policy
- **Decision**: All API endpoints must be verified before use in frontend code
- **Date**: 2025-12-29
- **Status**: ✓ Approved - enforced after duplicate observation bug (2899 count incident)
- **Rationale**:
  - Prevent silent failures when calling non-existent endpoints
  - Catch parameter mismatches early in development
  - Improve debugging and code quality
  - Avoid optimistic API calls without backend implementation
  - Discovered critical issue: frontend called `/api/observations/delete` without verifying it existed in backend
- **Core Rules**:
  1. ✓ **BEFORE** writing JavaScript code that calls an API endpoint:
     - Inspect the backend source code to verify the endpoint exists
     - Verify the HTTP method (GET, POST, DELETE, etc.)
     - Verify parameter names, types, and expected response format
  2. ✓ **BEFORE** calling an endpoint from the frontend:
     - Create the backend endpoint if it doesn't exist
     - Test it separately using curl/Postman before integrating into JS
  3. ✓ Add debug logging to capture requests, responses, and error conditions
  4. ✗ **NEVER** call an endpoint without first verifying it exists and its parameters
  5. ✗ **NEVER** assume parameter names - always match actual backend implementation
- **Implementation Guidelines**:
  - **Backend**: All API endpoints documented in `src/halo/api/routes.py`
  - **Frontend**: Debug logs must show endpoint, method, parameters, response status
  - **Testing**: Use browser Developer Tools to verify requests before merging code
  - **On Failure**: Check console logs for endpoint existence error before debugging data flow
  - **Code Review**: Check that every API call in JS has corresponding implementation in Python
- **Example - Observation Deletion**:
  - Endpoint: POST `/api/observations/delete` (lines 285-319 in routes.py)
  - Parameters: Object with KK, O, JJ, MM, TT, EE, GG fields
  - Response: `{"success": true/false, "deleted": true/false, "count": n}`
  - Called from: `main.js` line 2009 in `showObservationFormForEdit()`
- **Related Principles**: Applies to all inter-system communication (frontend↔backend, backend↔database)
- **Impact**: This principle prevents bugs and improves code quality during active development

### Internationalization
- **Decision**: JSON-based i18n with runtime language switching
- **Rationale**: 
  - Simple, maintainable
  - Easy to extract from Pascal source
  - Runtime switching without restart
- **Status**: ✓ Implemented
- **Files**: 
  - `resources/strings_de.json`
  - `resources/strings_en.json`

### Language Handling Architecture
- **Decision #010**: Session-based language management with server-side template rendering
- **Date**: 2025-12-24
- **Status**: ✓ Implemented

**Architecture Overview**:
1. **Server-Side Session Storage**: Language preference stored in Flask session (survives page reloads)
2. **Template Integration**: All templates use `{% if lang() == 'de' %}...{% else %}...{% endif %}` for bilingual content
3. **API Endpoints**: 
   - `GET /api/language` - Get current session language
   - `POST /api/language/<lang>` - Set session language
   - `GET /api/i18n/<lang>` - Get all strings for JavaScript (fallback/dynamic content)
4. **Page Reload Pattern**: Language switching triggers full page reload for consistent server-side rendering
5. **Middleware**: `@app.before_request` sets up language context for each request
6. **Context Processor**: Makes `_()`, `lang()`, and `i18n` available in all templates

**Implementation Details**:
- **Session Management** (`src/halo/resources/i18n.py`):
  - `set_language(lang)`: Updates both i18n instance AND Flask session
  - `get_current_language()`: Reads from Flask session with fallback to i18n instance
  - `get_i18n(language)`: Returns global i18n instance, reloads if language changed
- **Flask Integration** (`src/halo/web/app.py`):
  - `@app.before_request`: Initializes session language from browser if not set
  - `@app.context_processor`: Injects translation functions into all templates
  - Stores current language in `g.language` for request-scoped access
- **Template Pattern** (all `.html` files):
  - Language-aware HTML lang attribute: `<html lang="{{ lang() }}">`
  - Bilingual content blocks: `{% if lang() == 'de' %}German{% else %}English{% endif %}`
  - Server-rendered language buttons: `class="btn {% if lang() == 'de' %}btn-light{% else %}btn-outline-light{% endif %}"`
- **Client-Side** (`static/js/main.js`):
  - Loads current language from server on page load via `/api/language`
  - Language switching: POST to `/api/language/<lang>`, then `window.location.reload()`
  - localStorage used only as backup, session is source of truth

**Rationale**:
- **Progressive Enhancement**: Works without JavaScript (server renders correct language)
- **Consistent State**: Session ensures language persists across pages and reloads
- **Simple Mental Model**: One source of truth (session), templates always in sync
- **Best Practice**: Follows Flask-Babel pattern without adding dependency
- **Reliable**: Page reload eliminates complex client-side state synchronization issues

**Critical Implementation Rules**:
1. ✓ **ALL new pages/templates MUST**:
   - Use `lang="{{ lang() }}"` in `<html>` tag
   - Use `{% if lang() == 'de' %}...{% else %}...{% endif %}` for all user-visible text
   - Include both German and English versions of ALL text
2. ✓ **ALL new routes MUST**:
   - NOT set language independently
   - Use `get_current_language()` to read session language
   - Let `@app.before_request` handle language setup
3. ✓ **ALL new JavaScript MUST**:
   - Load language from `/api/language` endpoint, NOT localStorage
   - Use `window.currentLanguage` global variable
   - Call existing `switchLanguage(lang)` function, don't reimplement
4. ✗ **NEVER**:
   - Hardcode language in templates or routes
   - Use only German OR only English text
   - Implement custom language switching logic
   - Store language state outside Flask session (except localStorage backup)

### Data Management Architecture
- **Decision #011**: Server-side data storage and state management
- **Date**: 2025-12-24
- **Status**: ✓ Implemented

**Architecture Overview**:
All observation data, loaded files, and application state are stored server-side in Flask's `app.config`, not client-side. The client (browser) only maintains minimal state for UI interactions.

**Implementation Details**:
- **Server Storage** (`app.config`):
  - `OBSERVATIONS`: List of all loaded observation records
  - `LOADED_FILE`: Name of currently loaded file
  - `DIRTY`: Flag indicating unsaved changes
  - `INPUT_MODE`: Display mode setting (Number entry 'N' vs Menu entry 'M')
  - `ACTIVE_OBSERVERS_ONLY`: Filter to active observers only
- **Client Storage** (minimal):
  - `window.haloData`: Temporary cache for current page (lost on navigation)
  - `localStorage`: Only for language preference backup
  - No observation data stored client-side persistently
- **API Pattern**:
  - `/api/observations`: Returns data from `app.config['OBSERVATIONS']`
  - If not loaded yet, reads from file and stores in `app.config`
  - Data persists across page navigation within same session
  - File operations update `app.config` immediately

**Rationale**:
- **Single Source of Truth**: Server always has authoritative state
- **Memory Efficiency**: Browser doesn't need to hold large datasets
- **Consistency**: All pages see same data without synchronization complexity
- **Session Persistence**: Data survives page reloads and navigation
- **Simplicity**: No client-side storage/caching logic needed
- **Scalability**: Easier to add multi-user support in future

**Critical Implementation Rules**:
1. ✓ **ALL data mutations MUST**:
   - Update `app.config['OBSERVATIONS']` on server
   - Set `app.config['DIRTY'] = True` when data changes
   - Return updated state in API response
2. ✓ **ALL page loads MUST**:
   - Fetch data from `/api/observations` endpoint
   - NOT store observations in localStorage or IndexedDB
   - Use `window.haloData` only as temporary page-scoped cache
3. ✓ **File operations MUST**:
   - Update `app.config['LOADED_FILE']` when loading/saving
   - Clear `app.config['OBSERVATIONS']` when closing file
   - Prompt for save if `app.config['DIRTY'] = True`
4. ✗ **NEVER**:
   - Store observation data in client-side storage
   - Assume client state is persistent across navigation
   - Bypass server for data modifications
   - Cache large datasets in browser memory

**Trade-offs**:
- ✓ **Gains**: Simplicity, consistency, easy state management
- ✓ **Gains**: Foundation for future multi-user/cloud features
- ✗ **Costs**: Requires server running (not pure static site)
- ✗ **Costs**: Network requests for each page navigation (minimal for local server)

---

## UI/UX Decisions

### File Operations
- **Decision #001**: Use modern HTML5 file selector for both file selection and folder navigation
- **Original Behavior**: Separate "Change Folder" and "Open File" functions
- **New Behavior**: Unified file selector element
- **Rationale**: 
  - Standard web browser behavior
  - More intuitive for modern users
  - Reduces UI complexity
- **Trade-off**: 
  - Loss of explicit "change folder" command
  - Loss of "default folder" preference setting (browser file selector always starts with recently used folder)
- **Impact**: Medium - users must navigate to desired folder each session, but browser remembers last location
- **Approved**: Implicit (standard web pattern, no alternative available)
- **Status**: ✓ Implemented

### Data Display
- **Decision**: Maintain original display formats, layouts, and field positions
- **Rationale**: Preserve familiar user experience
- **Status**: In Progress
- **Note**: Web rendering may differ from DOS text mode but should maintain same information density and logical grouping

### Page Structure
- **Decision**: Unified header and footer across all pages
- **Rationale**: Ensure consistency between all pages in web application
- **Status**: ✓ Implemented

### Main Page Behavior
- **Decision**: Main page shows intro text when returning from functions
- **Original Behavior**: Main page populated with content (observations lists, statistics, analyses)
- **New Behavior**: Content is displayed only when actively working, intro text shown when returning to main
- **Rationale**: Clear distinction between active work and navigation state
- **Status**: ✓ Implemented

### Progress Indication
- **Decision**: Display spinner in modal popup for long-running operations
- **Behavior**: the headline KKOJJ MMTTg ... and the input window must be aligned, so that I see which value I currently enter
  - Popup window with status message (e.g. "file is loading")
  - Background is greyed out (modal overlay)
  - Prevents other interactions while operation in progress
- **Rationale**: Provide clear user feedback for functions that may take time
- **Status**: ✓ Implemented

### Standard Modal Dialog Layout
- **Decision #011**: All modal dialogs must use consistent layout pattern
- **Date**: 2025-12-25
- **Status**: ✓ Implemented

**Required Layout Pattern**:
```javascript
// Dialog wrapper - full-screen overlay with centered content
const dialog = document.createElement('div');
dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';

// Content box - white background with rounded corners
const content = document.createElement('div');
content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; min-width: 400px;';

// Standard button layout - right-aligned, Cancel before OK
// Cancel: default style with margin-right
// OK: blue background (#007bff), white text
```

**Key Elements**:
1. **Full-Screen Overlay**: Dark semi-transparent background (rgba(0,0,0,0.5))
2. **Centered Content**: White box with 20px padding and 8px border radius
3. **Button Order**: Cancel button (left) before OK button (right)
4. **Button Styling**: 
   - Cancel: Default style, 10px right margin
   - OK: Blue background (#007bff), white text, no border
5. **Keyboard Support**: ESC key closes dialog, Enter key activates OK button
6. **Focus Management**: OK button gets initial focus

**Applies To**:
- New file dialog (`showNewFileDialog`)
- Error dialogs (`showErrorDialog`)
- Settings dialogs (`showEingabeartDialog`)
- All future custom dialogs

**Rationale**:
- Ensures visual consistency across all dialogs
- Familiar interaction pattern for users
- Professional appearance
- Easy to maintain and replicate

**Critical Rules**:
- ✓ NEVER use custom positioning (transform: translate, absolute positioning)
- ✓ NEVER use custom colors (blue borders, colored backgrounds on wrapper)
- ✓ ALWAYS use flexbox centering for dialog wrapper
- ✓ ALWAYS include ESC key handler
- ✗ DO NOT mix patterns - use this exact layout for all custom dialogs

### Keyboard Navigation
- **Decision**: ESC key interrupts current function and returns to main window
- **Original Behavior**: ESC interrupts operation and returns to main
- **New Behavior**: Same - ESC interrupts and returns to main window
- **Rationale**: Preserve familiar navigation pattern
- **Status**: ✓ Implemented

### File Status Display (NEW FEATURE)
- **Decision #009**: Display file name and record count in menu bar
- **Original Behavior**: Not available in original program
- **New Behavior**: Right end of menu bar shows:
  - Name of currently loaded file
  - Number of records in file
- **Rationale**: Provides immediate context about current working file
- **Impact**: Low - additive feature, does not change existing functionality
- **Status**: ✓ Approved and Implemented

---

## Data Handling Decisions

### Observer Database
- **Decision**: Maintain multiple records per observer with validity dates
- **Original Format**: Binary file with records sorted by (K, seit)
- **Preserved**: Exact record structure and sorting algorithm
- **Status**: ✓ Documented
- **Reference**: See [HALO_DATA_FORMAT.md § Observer Record Structure](HALO_DATA_FORMAT.md#observer-record-structure-beobachter)

### Observation Records
- **Decision**: Preserve 8-level sort order
- **Sort Criteria**: J → M → T → ZS → ZM → K → E → gg
- **Rationale**: Ensures consistent data file organization
- **Status**: ✓ Documented
- **Implementation**: Must implement `spaeter()` function equivalent

### File-Based Architecture
- **Decision**: File-based data management (not database-based)
- **Original Behavior**: Explicit functions for file operations
- **Operations**:
  - **Read Data**: Explicit function to read observations from disk into memory
  - **Save Data**: Explicit function to save observations from memory to disk
  - **Create New**: Explicit function to create new empty files
- **Data Loss Prevention**:
  - Warning when unsaved changes exist before loading new file
  - Warning when file data was modified but not yet saved
  - User must confirm actions that may cause data loss
- **Rationale**: 
  - Preserves original workflow where users explicitly control file operations
  - Maintains clear separation between in-memory and on-disk data
  - Prevents accidental data loss through explicit save operations
- **Status**: ✓ Documented, Implementation pending

---

## HALO Key Standard Requirements

These are NOT decisions - they are fixed requirements from the HALO key observation standard and cannot be changed.

### Field Dependencies
- **Source**: HALO key standard (independent of program implementation)
- **Examples**:
  - d ≥ 4 forces N=0, C=0
  - N=9 requires c ≠ 0
  - E ∈ {8,9,10} requires height fields
  - E ∈ Sektor AND V=1 requires sector data
- **Status**: ✓ Documented, Implementation pending
- **Reference**: [HALO_DATA_FORMAT.md § Field Dependencies](HALO_DATA_FORMAT.md#field-dependencies-summary)

### Sector Notation
- **Source**: HALO key standard (independent of program implementation)
- **Format**: `a-b-c e-f` (octants a,b,c and e,f visible)
- **Clarification**: Each visible octant is explicitly listed with hyphens
- **Status**: ✓ Documented
- **Reference**: [HALO_DATA_FORMAT.md § Field 21 - Sectors](HALO_DATA_FORMAT.md#21-sektoren---sectors)

---

## Validation Decisions

### Data Validation
- **Decision**: Implement all original validation rules exactly
- **Includes**:
  - Required fields
  - Value ranges
  - Invalid combinations
  - Conditional requirements
- **Status**: ✓ Documented, Implementation pending
- **Reference**: [HALO_DATA_FORMAT.md § Data Validation Rules](HALO_DATA_FORMAT.md#data-validation-rules)

### Year Handling
- **Decision**: Preserve 2-digit year with century inference
- **Rule**: Year < 50 = 20xx, Year ≥ 50 = 19xx
- **Rationale**: Maintains compatibility with existing data
- **Status**: ✓ Documented

---

## Text and Terminology Decisions

### String Extraction
- **Decision**: Extract all UI strings from Pascal source files
- **Source Files**: 
  - `H_SPR.PAS` (ConO, ConN, ConC, ConE, etc. arrays)
  - Other Pascal UI modules
- **Process**: Direct extraction without interpretation or enhancement
- **Status**: ✓ In Progress
- **Storage**: JSON resource files

### Terminology Preservation
- **Decision**: Use original German and English terms exactly as in source
- **Examples**:
  - "Beobachter" / "Observer"
  - "Hauptbeobachtungsort" / "primary observing site"
  - "keine Angabe" / "not observed"
- **Rationale**: Maintains consistency with existing documentation and user expectations
- **Status**: Active principle

---

## Deferred Features

### Features NOT Yet Approved for Modification

1. **Statistics Module**: Original has statistical analysis
   - Status: To be evaluated
   - Decision pending: Python implementation approach

2. **Data Export Formats**: Beyond original .HAL/.BEO
   - Status: Not yet approved
   - CSV export was created for testing purposes only

### Decided Features

1. **Graphics Output**: 
   - **Decision**: ✓ Replace original DOS graphics with Python libraries
   - **Original**: DOS graphics output (BGI)
   - **New Approach**: Use modern Python visualization libraries
   - **Rationale**: DOS BGI not portable to web/modern platforms
   - **Status**: ✓ Approved

2. **Printing**: 
   - **Decision**: ✓ No specific printer drivers; rely on browser printing
   - **Original**: DOS printer control with specific drivers
   - **New Approach**: 
     - Preserve text output formats designed for printing
     - Use browser's native print functionality
   - **Rationale**: Modern browsers handle printing; no need for custom drivers
   - **Status**: ✓ Approved

---

## Technical Implementation Notes

## Original File Structure (Pascal)

```
HALOpy/
├── src/halo/           # Python package
├── data/               # CSV data files
├── resources/          # i18n JSON files
├── templates/          # HTML templates
├── static/             # CSS, JavaScript, images
├── temp/               # Test scripts (gitignored)
├── requirements.txt    # Python dependencies
├── run.py              # Application entry point
└── README.md           # Documentation
```


### Backend Architecture (Python/Flask)

```
src/halo/
├── models/          # Data structures (equivalent to H_TYPES.PAS)
│   ├── types.py         - Observation, Observer, FilterMask
│   └── constants.py     - MaxKenn, MaxEE, Sektor set, etc.
├── services/        # Business logic (equivalent to H_ROUT.PAS, H_BEOBNG.PAS)
│   ├── observations.py  - CRUD operations, spaeter() sorting
│   ├── observers.py     - Observer management, multi-record handling
│   ├── analysis.py      - Statistics, frequency analysis
│   └── validation.py    - Field validation, dependencies, rules
├── io/              # File operations (equivalent to H_FILES.PAS)
│   ├── csv_handler.py   - CSV file I/O (if CSV format chosen)
│   └── binary_handler.py - Binary file I/O (if binary format chosen)
├── resources/       # Internationalization (equivalent to H_SPR.PAS)
│   ├── i18n.py          - I18n class with language switching
│   ├── strings_de.json  - German strings from ConO, ConN, ConE arrays
│   └── strings_en.json  - English strings from ConO, ConN, ConE arrays
├── api/             # REST API endpoints
│   └── routes.py        - /api/observations, /api/observers, /api/statistics
└── web/             # Flask application
    └── app.py           - Application factory, routes, session management
```

### Frontend Structure

```
templates/           # HTML templates (Jinja2)
├── header.html         - Unified header (file name & record count in menu bar)
├── footer.html         - Unified footer
├── index.html          - Main page with intro text
├── observations.html   - Browse/search/edit observations
├── observers.html      - Observer management
└── statistics.html     - Charts and analysis

static/
├── css/
│   └── style.css       - Responsive design, modal overlays
└── js/
    ├── main.js         - API calls, i18n switching, ESC key handling
    └── spinner.js      - Modal spinner with greyed background
```

### API Endpoints

#### File Operations
- `POST /api/file/open` - Read data file into memory (with unsaved changes warning)
- `POST /api/file/save` - Save observations from memory to disk
- `POST /api/file/new` - Create new empty file (with unsaved changes warning)
- `GET /api/file/status` - Get current file name and record count

#### Observations
- `GET /api/observations?limit=100&offset=0` - Paginated observations (sorted by spaeter())
- `POST /api/observations` - Create observation
- `PUT /api/observations/<id>` - Update observation
- `DELETE /api/observations/<id>` - Delete observation
- `POST /api/observations/delete` - Delete observation by matching key fields

#### Observers
- `GET /api/observers` - List observers with validity periods
- `GET /api/observers/<k>` - Get all records for observer K
- `POST /api/observers` - Create observer record
- `PUT /api/observers/<k>/<seit>` - Update observer record

#### Analysis
- `GET /api/statistics` - Database statistics
- `GET /api/analysis/frequency` - Frequency analysis

#### Internationalization
- `GET /api/i18n/<lang>` - Get language strings (de/en)
- `POST /api/i18n/switch` - Switch UI language

### Module Structure
```
src/halo/
  ├── io/          # Binary file I/O (equivalent to H_FILES.PAS)
  ├── models/      # Data structures (equivalent to H_TYPES.PAS)
  ├── services/    # Business logic (equivalent to H_ROUT.PAS, H_BEOBNG.PAS)
  ├── api/         # Web API routes
  ├── web/         # Web UI
  └── resources/   # i18n strings
```

### Encoding
- **Decision**: Handle DOS/ANSI special characters correctly
- **Original**: DOS codepage (CP437/CP850)
- **Target**: UTF-8 with proper conversion
- **Special Characters**: Degree symbol (°), German umlauts (ä,ö,ü,Ä,Ö,Ü,ß)
- **Status**: To be implemented

### Date/Time Handling
- **Decision**: Use CET timezone as in original
- **Reference**: Original specifies "CET (Central European Time)"
- **Status**: To be implemented

### Deployment Options

#### Local Development
```bash
cd c:\ASTRO\HALOpy
pip install -r requirements.txt
python run.py
# Open http://localhost:5000
```

#### Local Network Server
- Same computer: http://localhost:5000
- Other devices on network: http://[local-ip]:5000
- Accessible from any device with web browser

#### Cloud Deployment Options (if needed)
- Heroku: Simple git-based deployment
- AWS Elastic Beanstalk: Scalable cloud hosting
- Google Cloud Run: Containerized deployment

**Note**: Deployment decision (Principle #2 - Open Question) will determine final hosting approach

## Running Application

**Server is currently running!**
- URL: http://localhost:5000
- Also available on network: http://192.168.178.179:5000
- Debug mode enabled for development
- Auto-reloads on code changes

Press Ctrl+C in terminal to stop server.

---

## Decision Log

This section tracks all architectural and implementation decisions in chronological order.

### December 2025

**2024-12-23**
- ✓ Created comprehensive data format documentation
- ✓ Documented all field types and dependencies from Pascal source
- ✓ Extracted exact ConO, ConN, ConC, ConE, Condd, ConH, ConF, ConV, Conff, ConG array values
- ✓ Documented Observer record structure
- ✓ Documented file sorting criteria for observations and observers
- ✓ Decision #001: Use standard file selector (implicit approval)
- ✓ Clarified sector notation: each visible octant explicitly listed with hyphens
- ✓ Clarified sector relevance: only for incomplete halos (V=1), not complete (V=2)
- ✓ Documented observer file structure: multiple records per observer with validity periods
- ✓ Decision #002: Graphics output - Replace DOS BGI with Python visualization libraries
- ✓ Decision #003: Printing - No custom printer drivers, use browser printing, preserve print-formatted text output
- ✓ Decision #004: Unified header and footer across all pages
- ✓ Decision #005: Main page shows intro text when returning from functions
- ✓ Decision #006: Display spinner for long-running operations
- ✓ Decision #007: ESC key interrupts and returns to main window
- ✓ Decision #008: File-based architecture with explicit read/save/create functions and data loss warnings
- ✓ Decision #009: NEW FEATURE - Display file name and record count in menu bar (not in original program)
- ✓ Decision #010: Session-based language management with server-side template rendering (2025-12-24)
- ✓ Decision #011: Server-side data storage and state management (2025-12-24)
- ✓ Decision #012: Do not use virtual environments (venv) for HALOpy (2025-12-25)
- ✓ Decision #013: All API endpoints must be verified before use in frontend code (2025-12-29)

---

## Open Questions

Items requiring decision/approval:

1. **Performance**: Acceptable performance thresholds for web vs. original DOS?
2. **Deployment**: Desktop app (Electron/similar) or pure web?
3. **File Storage Format**: Binary files (.HAL, .BEO with compression) vs. CSV as primary format?
4. **Statistics Module**: Implementation approach for statistical analysis features

---

## Change Request Template

For proposing new decisions:

```markdown
### Proposed Change: [Brief Description]
- **Current Behavior**: [How it works in original]
- **Proposed Behavior**: [What you want to change]
- **Rationale**: [Why this change is beneficial]
- **Impact**: [What will be affected]
- **Trade-offs**: [What we lose/gain]
- **Status**: Pending Approval
```

---

## Version History

- **v1.0** (2024-12-23): Initial documentation of project principles and decisions made to date
- **v1.1** (2025-12-23): Integrated web architecture details
- **v1.2** (2025-12-29): Added Decision #013 - API Endpoint Usage Policy principle
- **v1.3** (2026-01-04): Moved to .github/copilot-context.md for GitHub Copilot integration
