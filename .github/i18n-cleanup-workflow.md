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

### Phase 4: Nächste Konsolidierung
- Validation-Report öffnen
- Nächsten fehlenden Key mit vielen Verwendungen auswählen
- Zurück zu Phase 2

## Erfolgreich abgeschlossene Konsolidierungen

### Konsolidierung #1 & #2: common.active
- **Alte Keys**: `active_label`, `table_active`
- **Neuer Key**: `common.active` (existierte bereits in JSON)
- **Modus**: Code-only
- **Dateien**: `observers.js`, `filter.js`
- **Zeilen**: 4 replacements (observers.js: 118, 191; filter.js: 9, 130)
- **Status**: ✓ Erfolgreich

### Konsolidierung #3: observers.add_title
- **Alter Key**: `add_title`
- **Neuer Key**: `observers.add_title` (existierte bereits in JSON)
- **Modus**: Code-only
- **Dateien**: `main.js`
- **Zeilen**: 1 replacement (main.js: 7249)
- **Status**: ✓ Erfolgreich

### Konsolidierung #4 & #5: menus.analysis.*
- **Alte Keys**: `analysis.create`, `analysis.load`
- **Neue Keys**: `menus.analysis.create`, `menus.analysis.load` (existierten bereits in JSON)
- **Modus**: Code-only
- **Dateien**: `main.js`
- **Zeilen**: 4 replacements (main.js: 1851, 1852, plus 2 in auskommentiertem else-Block)
- **Status**: ✓ Erfolgreich
- **Zusätzlich**: updateMenuText() Funktion refactored (73 Zeilen Duplikat-Code entfernt)

## Aktuelle Statistiken

Nach i18n-Bereinigung (Stand: 2026-01-23):
- **Definierte Keys**: 711 (war 688, +23 durch neue chart_title/chart_subtitle Keys)
- **Referenzierte Keys**: 406 (war ~349, +57 durch Hardcoded-String-Ersetzungen)
- **Fehlende Keys**: 123 (war 119, +4 neue dynamische Zugriffe erkannt)
- **Ungenutzte Keys**: 244 (war 263, -19 durch Verwendung bestehender Keys)
- **Dynamische Array-Zugriffe**: 16 Kategorien mit 197 abgedeckten Keys
- **Audit-Timestamp**: 2026-01-23 23:34:23
- **Validation-Timestamp**: 2026-01-23 23:34:34

## Nächste Schritte

### Priorität: Top Missing Keys (aus letztem Validation Report)

1. **analysis_dialog.param_names** (26 Verwendungen)
   - Komplex: Array-Struktur, nicht einfacher String
   - Muss Datenstruktur verstehen bevor Konsolidierung

2. **Observations-Keys** (mehrere mit 5-15 Verwendungen)
   - Suche systematisch nach richtigem Ziel-Key in JSON
   - Führe Code-only Konsolidierungen durch

3. **Observer-Keys** (mehrere mit 5-10 Verwendungen)
   - Ähnlicher Ansatz wie Observations

4. **Settings/Output-Keys** (mehrere Einzelfälle)
   - Nach und nach abarbeiten

### Strategie

1. ✓ **Niedrig hängende Früchte zuerst**: Keys mit eindeutiger Zuordnung und vielen Verwendungen
2. **Code-only bevorzugen**: Wenn Key bereits in JSON existiert (schneller, weniger riskant)
3. **Validation nach jeder Konsolidierung**: Bestätigen dass missing keys weniger werden
4. **Audit neu laufen**: Nach jeder Konsolidierung, damit CSV aktuell bleibt

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

## Typischer Dialog-Start

```
User: "Lass uns die nächsten fehlenden i18n-Keys konsolidieren"

Agent: 
1. Öffne letzten Validation Report: temp/i18n_validation_YYYYMMDD_HHMMSS.txt
2. Zeige Top 5 missing keys mit Anzahl Verwendungen
3. Frage: "Welchen Key sollen wir als nächstes konsolidieren?"

User: "Mach observers.xyz"

Agent:
1. Suche in strings_de.json nach passendem Key (grep_search)
2. Zeige gefundene Keys zur Bestätigung
3. Wenn Key existiert: Code-only consolidation
4. Wenn Key nicht existiert: Frage nach DE/EN Texten für Full consolidation
5. Führe consolidate_i18n_key.py aus
6. Zeige Ergebnis (X replacements)
7. Frage: "Soll ich Audit/Validation neu laufen lassen?"
```

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

## Backup-Strategie

Nach erfolgreichen Konsolidierungen:
```powershell
# Backup erstellen
Copy-Item resources\strings_de.json resources\strings_de.json.source
Copy-Item resources\strings_en.json resources\strings_en.json.source

# Bei Problemen zurücksetzen
Copy-Item resources\strings_de.json.source resources\strings_de.json
Copy-Item resources\strings_en.json.source resources\strings_en.json
```

## Troubleshooting

### "Key not found in JSON"
- Prüfe Hierarchie: `menus.file.load` nicht `file.load`
- Suche mit grep_search in strings_de.json
- Eventuell ist Key unter anderem Namen vorhanden

### "No replacements made"
- Audit-CSV veraltet → neu laufen lassen
- Key-Schreibweise prüft (Groß-/Kleinschreibung)
- Eventuell wurde Key bereits konsolidiert

### "Missing keys nicht weniger geworden"
- Validation-Report Timestamp prüfen (alter Report?)
- Audit neu laufen lassen vor Validation
- Eventuell war Code-Referenz nicht in Audit-CSV

## Ziel

**Endzustand**: Missing keys = 0, alle Code-Referenzen nutzen existierende JSON-Keys, fail-fast Prinzip durchgängig implementiert.

**Fortschritt**: 5/124 Keys konsolidiert (4% geschafft), 119 Keys verbleibend.

---

*Dieser Prompt dient als Kontext für systematische i18n-Cleanup Sessions. Bei jedem neuen Dialog mit diesem Prompt starten, um sofort produktiv arbeiten zu können.*
