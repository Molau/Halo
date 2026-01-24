# i18n Cleanup Workflow - System Prompt

## Project Context

HALOpy ist eine Python/Flask-Web-Migration des Pascal DOS-Programms HALO. Das Projekt verwendet ein bilinguales i18n-System (DE/EN) mit JSON-basierten Übersetzungen in `resources/strings_de.json` und `resources/strings_en.json`.

**Aktuelle Situation**: Nach der initialen Migration existieren Inkonsistenzen zwischen definierten i18n-Keys und deren Verwendung im Code. Wir beheben diese systematisch mit drei spezialisierten Tools.

## Die drei Tools

### 1. audit_i18n_usage.py
- **Zweck**: Scannt den gesamten Code und erstellt vollständige Inventur der i18n-Verwendung
- **Output**: `temp/i18n_key_usage_audit.csv` mit Spalten: key, file, line, context
- **Funktion**: Zeigt ALLE Stellen wo i18n-Keys referenziert werden (korrekte und inkorrekte)
- **Verwendung**: `python scripts\audit_i18n_usage.py`
- **Wichtig**: Nach jeder Konsolidierung neu laufen lassen, da sich Key-Namen ändern

### 2. validate_i18n_keys.py
- **Zweck**: Validiert Konsistenz zwischen definierten und verwendeten Keys
- **Output**: `temp/i18n_validation_YYYYMMDD_HHMMSS.txt` mit Statistiken und Listen
- **Funktion**: 
  - Zählt definierte Keys (aktuell: 688)
  - Zählt referenzierte Keys (aktuell: ~349)
  - Findet fehlende Keys (aktuell: 119) - im Code verwendet, aber nicht in JSON definiert
  - Findet ungenutzte Keys (aktuell: 263) - in JSON definiert, aber nie verwendet
- **Verwendung**: `python scripts\validate_i18n_keys.py`
- **Wichtig**: Timestamp im Dateinamen für Verlaufsvergleich

### 3. consolidate_i18n_key.py
- **Zweck**: Automatisierte Konsolidierung von i18n-Keys (umbenennen/zusammenführen)
- **Modi**:
  - **Full**: Key in JSON hinzufügen/umbenennen UND Code-Referenzen aktualisieren
  - **Add-only**: Nur neuen Key in JSON hinzufügen (mit `--add-only`)
  - **Code-only**: Nur Code-Referenzen aktualisieren, JSON nicht ändern (kein `--value-de/--value-en`)
- **Parameter**:
  - `--old-keys "key1" "key2"`: Alte Key-Namen (mehrere möglich)
  - `--new-key "new.key"`: Neuer Key-Name
  - `--value-de "Deutscher Text"`: Deutsche Übersetzung (optional)
  - `--value-en "English Text"`: Englische Übersetzung (optional)
  - `--add-only`: Nur JSON-Eintrag erstellen, keine Code-Änderungen
- **Verwendung**: 
  ```powershell
  # Code-only (Key existiert schon in JSON):
  python scripts\consolidate_i18n_key.py --old-keys "old.key" --new-key "new.key"
  
  # Full consolidation (Key neu erstellen):
  python scripts\consolidate_i18n_key.py --old-keys "old.key" --new-key "new.key" --value-de "Text" --value-en "Text"
  ```
- **Wichtig**: Verwendet Audit-CSV für präzise Line-basierte Ersetzung
- **Sicherheit**: Niemals manuelle Edits - immer das Skript verwenden!

## Etablierter Workflow

### Phase 1: Inventur
```powershell
$env:PYTHONIOENCODING="utf-8"; python scripts\audit_i18n_usage.py
$env:PYTHONIOENCODING="utf-8"; python scripts\validate_i18n_keys.py
```
- Audit erstellt vollständige CSV-Liste aller Key-Verwendungen
- Validate zeigt Statistiken: definiert, referenziert, fehlend, ungenutzt

### Phase 2: Einzelne Konsolidierung
```powershell
# Beispiel: common.active existiert bereits in JSON, aber Code verwendet alte Keys
python scripts\consolidate_i18n_key.py --old-keys "active_label" "table_active" --new-key "common.active"
```
- Skript liest Audit-CSV
- Findet alle Vorkommen der alten Keys
- Ersetzt präzise an den dokumentierten Zeilen
- Gibt Zusammenfassung aus (X replacements in Y files)

### Phase 3: Backup & Validierung
```powershell
# NACH erfolgreicher Konsolidierung: Backup erstellen
Copy-Item resources\strings_de.json resources\strings_de.json.source -Force
Copy-Item resources\strings_en.json resources\strings_en.json.source -Force

# Audit neu laufen lassen (alte Keys sollten verschwunden sein)
python scripts\audit_i18n_usage.py

# Validation neu laufen lassen (missing keys sollten weniger werden)
python scripts\validate_i18n_keys.py
```

## Wichtige Prinzipien

### Decision #015: Fail Fast - No Fallbacks
- **Regel**: NIEMALS Fallback-Werte verwenden: `i18n?.key || 'default'` ist VERBOTEN
- **Korrekt**: `i18n.key` - direkter Zugriff ohne optional chaining
- **Grund**: Fehlende Keys sollen sofort Fehler werfen, nicht still ignoriert werden

### Decision #021: Lockstep DE/EN Maintenance
- **Regel**: Beide Sprachdateien IMMER synchron ändern
- **Struktur**: Identische Hierarchie, Key-Namen, Zeilen-Reihenfolge
- **Werkzeug**: `sync_i18n.py` für strukturelle Änderungen

### Decision #022: i18n Changes Require Code Audit
- **Regel**: Nach JEDER i18n-Änderung vollständigen Code-Audit durchführen
- **Grund**: Key-Umbenennungen brechen Code-Referenzen
- **Werkzeug**: grep_search für alle Referenzen, dann mit consolidate_i18n_key.py fixen

### Niemals manuelle Edits
- **IMMER** consolidate_i18n_key.py verwenden
- **NIEMALS** JSON oder JS manuell editieren
- **GRUND**: Manuelle Edits führen zu Tippfehlern, vergessenen Stellen, Inkonsistenzen


## Arbeitsweise bei hardcodierten Strings (Decision #023)

**Regel**: Beim Ersetzen von hardcodierten Strings (z.B. `currentLanguage === 'de' ? 'Deutsch' : 'English'`) mit i18n-Referenzen:

1. ✓ **EINZELN vorgehen**: Jede Ersetzung separat durchführen, nicht mehrere gleichzeitig
2. ✓ **NACHEINANDER**: Eine Ersetzung nach der anderen, nicht parallel
3. ✓ **EXPLIZITE BESTÄTIGUNG**: Nach jeder erfolgreichen Ersetzung auf Benutzerbestätigung warten
4. ✓ **NICHT WEITERGEHEN** ohne explizites "weiter", "ja" oder ähnliche Bestätigung vom Benutzer

**Rationale**: 
- Verhindert Fehler durch komplexe Batch-Operationen
- Whitespace-Probleme bei multi_replace werden vermieden
- Benutzer behält Kontrolle und Überblick
- Jeder Schritt kann einzeln verifiziert werden

**Anti-Pattern** (VERBOTEN):
- ✗ Mehrere Replacements in einem multi_replace_string_in_file Call
- ✗ Ohne Bestätigung zum nächsten String weitergehen
- ✗ Batch-Operationen vorschlagen ohne explizite Erlaubnis

**Correct Pattern**:
```
Agent: Ersetzt String X mit i18n.key.Y
[Tool: replace_string_in_file]
Agent: "✓ Erledigt. Weiter?"
User: "ja" / "weiter"
Agent: Ersetzt String A mit i18n.key.B
[Tool: replace_string_in_file]
Agent: "✓ Erledigt. Weiter?"
...
```
## Ziel

**Endzustand**: Missing keys = 0, alle Code-Referenzen nutzen existierende JSON-Keys, fail-fast Prinzip durchgängig implementiert.


---

*Dieser Prompt dient als Kontext für systematische i18n-Cleanup Sessions. Bei jedem neuen Dialog mit diesem Prompt starten, um sofort produktiv arbeiten zu können.*
