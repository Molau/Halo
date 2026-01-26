# HALOpy Project - Copilot Instructions

This document provides workflow guidance for GitHub Copilot when working on the HALOpy migration project.

---

## Documentation Hierarchy

### Tier 1: Pascal Source Code - MIGRATION REFERENCE (ARCHIVED) 📚
- **Location**: `c:\ASTRO\HALO\QUELLEN\*.PAS`
- **Authority**: HISTORICAL - Migration completed, no longer primary reference
- **Purpose**: Historical reference only; HALOpy is now the authoritative implementation
- **Status**: ✓ Migration completed - use only for understanding original design decisions
- **Key Files**:
  - `H_TYPES.PAS` - Data structures, constants (MaxKenn, Germany regions, etc.)
  - `H_SPR.PAS` - All UI strings (ConO, ConN, ConE, ConH, ConF, ConV, etc.)
  - `H_BEOBNG.PAS` - Observation handling, kurzausgabe(), langausgabe()
  - `H_BEOBER.PAS` - Observer management
  - `H_AUSG.PAS` - Output functions (statistics, reports)
  - `H_ROUT.PAS` - Utility functions
  - `H_FILES.PAS` - Binary file I/O
  - `H_MENU.PAS` - Menu system
  - `H_WIN.PAS` - Window management
  - `H_EING.PAS` - Input handling

**Rule**: When implementing ANY feature, ALWAYS check the Pascal source first. Never guess or assume.

### Tier 2: copilot-context.md - Implementation Decisions 🔒
- **Location**: `.github/copilot-context.md`
- **Authority**: HIGH - Team decisions during migration
- **Purpose**: Architectural decisions, technology choices, approved changes
- **Status**: Requires explicit approval before adding new decisions
- **Usage**: Reference for understanding WHY things are implemented a certain way

### Tier 3: HALO_DATA_FORMAT.md - Data Standard 🔒
- **Location**: `docs/HALO_DATA_FORMAT.md`
- **Authority**: FIXED - This is a community standard, NOT changeable
- **Purpose**: Complete specification of observation record format
- **Content**: Field definitions, validation rules, dependencies
- **Status**: Reference only - cannot be changed without breaking compatibility

---

## Core Principles (from copilot-context.md)

### 1. Strict Fidelity to Original
- Maintain original program structure, logic, and UI as closely as possible
- Preserve proven workflow developed over 30 years
- Use original German and English texts EXACTLY - no rephrasing or independent translation
- All texts must come directly from Pascal source (H_SPR.PAS)

### 2. Code Reuse and DRY
- ALWAYS reuse existing code, data structures, and patterns
- Before implementing, search for similar existing code
- Reuse: alerts/dialogs, constants, functions, UI components, API patterns
- Use i18n strings for geographic regions, halo types, months, etc.
- Never hardcode data that exists in i18n files

### 3. Data Integrity
- Preserve standardized observation record format exactly
- Maintain original validation rules and field dependencies
- Cannot be changed - this is a community standard

### 4. Controlled Evolution
- No function omission or new features without explicit approval
- All changes must be proposed, approved, and documented
- Architecture decisions go in copilot-context.md (requires approval)

---

## Copilot Workflow

### When Starting a Task

1. **Understand the requirement**
   - What is the user asking for?
   - Is this a new feature or fixing existing functionality?

2. **Check existing HALOpy implementation**
   - How does HALOpy currently handle this?
   - What are the existing patterns, validation rules, business logic?
   - Location: `src/halo/`, `static/js/`, `templates/`

3. **Check copilot-context.md** (Tier 2)
   - Are there existing decisions about this functionality?
   - What technology stack choices apply?
   - Are there related architectural principles?

4. **Search for existing code**
   - Does similar functionality already exist in HALOpy?
   - Can we reuse existing patterns, components, or functions?
   - Check: API routes, services, UI components, i18n strings

5. **When asked about specific UI text** (e.g., "error in observation modify dialog"):
   - **FIRST**: Search i18n files (`resources/strings_de.json`, `resources/strings_en.json`) for the actual text
   - Find the exact i18n key (e.g., `observations.modify_title`, not guessed names like `obs_change`)
   - **THEN**: Search codebase using that i18n key name
   - This approach is faster and more accurate than guessing function/variable names

6. **Propose approach**
   - If implementing as-is from Pascal: proceed
   - If deviating from original: explain why and get approval
   - If architectural decision needed: use Change Request Template

### During Implementation

1. **Add decisions without approval**: Never update copilot-context.md without explicit user approval
2. **Use exact original text**: Extract strings from H_SPR.PAS, don't rephrase
3. **Reuse existing patterns**: Don't reinvent dialogs, validations, formatters
4. **Follow existing code style**: Match patterns already established in HALOpy
5. **Test against original**: Does behavior match HALO.EXE?

### When Making Changes

**For minor updates** (bug fixes, UI tweaks):
- Update code directly
- No approval needed

**For new features or deviations**:
- Explain what changes and why
- Reference Pascal source if deviating
- Get explicit approval
- Add to copilot-context.md with Decision #XXX

**For architectural decisions**:
- Use Change Request Template in copilot-context.md
- Must include: Current Behavior, Proposed Behavior, Rationale, Impact, Trade-offs
- Requires explicit approval before implementation

---

## Quick Reference

### Where to look for...

- **How original program works** → Read Pascal source (`HALO\QUELLEN\*.PAS`)
- **UI text (German/English)** → `H_SPR.PAS` ConO, ConN, ConE arrays
- **Data structures** → `H_TYPES.PAS` and `HALO_DATA_FORMAT.md`
- **Validation rules** → `H_EING.PAS` and `HALO_DATA_FORMAT.md`
- **Why something is implemented a certain way** → Read [copilot-context.md](copilot-context.md)
- **Current code patterns** → Search HALOpy codebase (`src/halo/`, `static/js/`, `templates/`)

### Common Questions

**Q: Can I improve the UI text?**  
A: No. Use exact text from H_SPR.PAS. This is 30 years of user familiarity.

**Q: Can I add a new feature?**  
A: Only with explicit approval. Propose with rationale and get approval first.

**Q: The original validation seems wrong, can I fix it?**  
A: This is Open Question #3 in copilot-context.md. Decision pending. For now, CSV is used as temporary workaround.

**Q: Can I update copilot-context.md?**  
A: Only with explicit approval. Use Change Request Template and wait for approval.

**Q: Should I create a new modal or reuse existing?**  
A: Always reuse existing patterns. Check `showWarningModal()`, Bootstrap modal patterns in templates.

**Q: User mentions a specific UI text (e.g., "error in observation dialog")?**  
A: Search i18n files for the actual text first to find the key name, then search code using that key. Don't guess function names.

---

## Documentation Rules

**What goes where:**

1. **Pascal Source** (NEVER EDIT - read only)
   - Original program functionality
   - All UI strings, validation rules, business logic

2. **copilot-context.md = OUR DECISIONS** (Need approval before adding)
   - Technology choices (Flask, Python, no venv)
   - Architectural principles (strict fidelity, code reuse)
   - Approved deviations from original
   - Decision log with rationale

3. **HALO_DATA_FORMAT.md = THE STANDARD** (NEVER EDIT - reference only)
   - Observation record format specification
   - Field definitions and validation
   - Community standard, not changeable

<!-- PROGRESS.md section removed: migration complete; status tracking discontinued -->

---

## Remember

- **Pascal source is THE TRUTH** - Always check it first
- **Exact fidelity matters** - Don't improve or modernize without approval
- **Reuse, don't reinvent** - Search before implementing
- **Get approval for changes** - Architecture decisions require explicit approval
- **Document decisions** - Use copilot-context.md for approved changes

---

*Last updated: 2026-01-04*
*This file guides GitHub Copilot's behavior when working on HALOpy migration*
