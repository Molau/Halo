// HALO Web Application JavaScript

// Language will be loaded from server session on page load
let currentLanguage = 'de';
window.currentLanguage = currentLanguage;
let i18nStrings = {};
let observerData = null; // cache of observer data with regions

// Global data store for loaded observations
window.haloData = {
    observations: [],
    fileName: null,
    isLoaded: false,
    isDirty: false
};

// Helper function to save haloData metadata to sessionStorage
// Note: We only save metadata (fileName, isLoaded, isDirty, count), NOT the observations array
// For large files (200k+ observations), storing all data exceeds browser storage limits
// Server keeps all observations in memory, so we fetch them via API when needed
function saveHaloDataToSession() {
    if (window.haloData && window.haloData.isLoaded) {
        try {
            // Store only metadata, not the full observations array
            const metadata = {
                fileName: window.haloData.fileName,
                isLoaded: window.haloData.isLoaded,
                isDirty: window.haloData.isDirty,
                count: window.haloData.observations?.length || 0
            };
            sessionStorage.setItem('haloData', JSON.stringify(metadata));
        } catch (e) {
            console.error('Error saving metadata to sessionStorage:', e);
            sessionStorage.removeItem('haloData');
        }
    } else {
        sessionStorage.removeItem('haloData');
    }
}

// Load language and translations on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Clean up any debug info from previous operations
    sessionStorage.removeItem('deleteDebug');
    sessionStorage.removeItem('loadDebug');
    
    // Restore file state metadata from sessionStorage if available
    // Note: We only restore metadata, not observations array
    // Observations are always fetched from server when needed
    const savedHaloData = sessionStorage.getItem('haloData');
    if (savedHaloData) {
        try {
            const metadata = JSON.parse(savedHaloData);
            // Restore metadata only
            window.haloData.fileName = metadata.fileName;
            window.haloData.isLoaded = metadata.isLoaded;
            window.haloData.isDirty = metadata.isDirty;
            // Don't restore observations array - it will be fetched from server when needed
            window.haloData.observations = [];
        } catch (e) {
            console.error('Error restoring haloData metadata from sessionStorage:', e);
            sessionStorage.removeItem('haloData');
        }
    }
    
    // Get current language from server session
    await loadCurrentLanguage();
    await loadI18n(currentLanguage);
    setupLanguageSwitcher();
    setupMenuHandlers();
    setupHoverDropdowns();
    
    // Clear file info on startup - but only if sessionStorage didn't restore data
    if (!window.haloData.isLoaded) {
        clearFileInfoDisplay();
    }
    
    // Check for autosave recovery first
    await checkAutosaveRecovery();
    
    // Check if data is loaded on server and update file info display
    // This also syncs window.haloData with server state
    await checkAndDisplayFileInfo();
    
    // Check for edit debug logs from previous operation
    const editLogs = sessionStorage.getItem('lastEditLogs');
    if (editLogs) {
        console.log('=== EDIT DEBUG LOGS FROM PREVIOUS OPERATION ===');
        console.log(editLogs);
        console.log('=== END EDIT DEBUG LOGS ===');
        sessionStorage.removeItem('lastEditLogs');
    }
});

// Load current language from server session
async function loadCurrentLanguage() {
    const response = await fetch('/api/language');
    if (!response.ok) {
        throw new Error('Failed to load language from server');
    }
    const data = await response.json();
        currentLanguage = data.language || 'de'; // Default to 'de' if not provided
    window.currentLanguage = currentLanguage;
}

async function loadObserverCodes() {
    if (observerData) return observerData;
    const resp = await fetch('/api/observers/list');
    if (!resp.ok) throw new Error('Konnte Beobachterliste nicht laden');
    const data = await resp.json();
    const observers = data.observers || [];
    const codeSet = new Set(
        observers
            .map(o => o.KK ?? o.k ?? o.kk)
            .filter(Boolean)
            .map(code => String(code).padStart(2,'0').toUpperCase())
    );
    observerData = { codeSet, observers };
    return observerData;
}

// Show Bootstrap confirmation dialog instead of browser confirm()
function showConfirmDialog(title, message, onConfirm, onCancel) {
    const modalId = 'confirm-modal-' + Math.random().toString(36).substr(2, 9);
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common?.cancel || 'Abbrechen'}</button>
                        <button type="button" class="btn btn-primary" id="confirm-yes-${modalId}">${i18nStrings.common?.ok || 'OK'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalEl);
    
    document.getElementById('confirm-yes-' + modalId).addEventListener('click', () => {
        modal.hide();
        if (onConfirm) onConfirm();
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => {
        if (!modal._isShown) {
            modalEl.remove();
            if (onCancel) onCancel();
        }
    });
    
    modal.show();
}

// Setup hover dropdowns
function setupHoverDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-item.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        let timeoutId;
        
        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            const bsDropdown = new bootstrap.Dropdown(toggle);
            bsDropdown.show();
        });
        
        dropdown.addEventListener('mouseleave', () => {
            timeoutId = setTimeout(() => {
                const bsDropdown = bootstrap.Dropdown.getInstance(toggle);
                if (bsDropdown) {
                    bsDropdown.hide();
                }
            }, 100);
        });
    });
}

// Setup menu click handlers
function setupMenuHandlers() {
    // Handle all menu item clicks (works with Bootstrap dropdowns)
    document.querySelectorAll('.dropdown-item').forEach(link => {
        link.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action) {
                e.preventDefault();
                handleMenuAction(action);
            }
        });
    });
}

// Handle menu actions
function handleMenuAction(action) {
    console.log('Menu action:', action);
    
    switch(action) {
        // File menu
        case 'new-file':
            showNewFileDialog();
            break;
        case 'load':
            showLoadFileDialog();
            break;
        case 'save':
            showSaveFileDialog();
            break;
        case 'save-as':
            showSaveAsDialog();
            break;
        case 'export':
            window.location.href = '/api/observations?format=csv';
            break;
            
        // Observations menu
        case 'obs-display':
            showDisplayObservationsDialog();
            break;
        case 'obs-add':
            showAddObservationDialog();
            break;
        case 'obs-modify':
            showModifyObservationsDialog();
            break;
        case 'obs-delete':
            showDeleteObservationsDialog();
            break;
            
        // Observers menu
        case 'observer-add':
            showAddObserverDialog();
            break;
        case 'observer-modify':
            showEditObserverDialog();
            break;
        case 'observer-delete':
            showDeleteObserverDialog();
            break;
            
        // Analysis menu
        case 'analysis-one':
            window.location.href = '/statistics';
            break;
        case 'analysis-two':
            console.info('Two-parameter analysis not implemented');
            break;
            
        // Settings menu
        case 'settings-fixed-observer':
            showFixedObserverDialog();
            break;
        case 'settings-eingabeart':
            showEingabeartDialog();
            break;
        case 'settings-active-observers':
            showActiveObserversDialog();
            break;
            
        // Output menu
        case 'output-monthly-report':
            window.location.href = '/monthly-report';
            break;
        case 'output-monthly-stats':
            window.location.href = '/monthly-stats';
            break;
        case 'output-yearly-stats':
            console.info('Yearly stats not implemented');
            break;
            
        // Help menu
        case 'help-version':
            showVersionDialog();
            break;
        case 'help-new':
            showWhatsNewDialog();
            break;
        case 'help-text':
            showHelpDialog();
            break;
            
        // Exit menu
        case 'exit':
            showConfirmDialog(
                i18nStrings.exit?.title || 'Beenden',
                i18nStrings.exit?.confirm_exit || 'Möchten Sie das Programm beenden?',
                () => window.close()
            );
            break;
        case 'return':
            window.location.href = '/';
            break;
            
        default:
            console.info(`Function "${action}" not implemented`);
    }
}
// Add Observation dialog entry point
async function showAddObservationDialog() {
    try {
        const modeResp = await fetch('/api/config/inputmode');
        const modeData = await modeResp.json();
        const mode = modeData.mode || 'N';
        if (mode === 'N') {
            return await showAddObservationDialogNumeric();
        } else {
            return await showAddObservationDialogMenu();
        }
    } catch (e) {
        console.error('Add observation dialog error:', e);
    }
}

// Numeric entry (Kurzeingabe) dialog
async function showAddObservationDialogNumeric() {
    // Check if a file is loaded
    if (!window.haloData.isLoaded) {
        showWarningModal(i18nStrings.menus?.observations?.no_file_loaded || 'Please load or create a file first.');
        return;
    }
    
    // Ensure i18n is loaded
    if (!i18nStrings.menus?.observations) {
        await loadI18n(currentLanguage);
        if (!i18nStrings.menus?.observations) {
            console.error('Failed to load i18n strings:', i18nStrings);
            throw new Error('i18n strings not loaded');
        }
    }
    
    // Get fixed observer setting
    let fixedObserver = '';
    try {
        const configResponse = await fetch('/api/config/fixed_observer');
        const config = await configResponse.json();
        fixedObserver = config.observer || '';
    } catch (e) {
        console.error('Error loading fixed observer:', e);
    }
    
    const title = i18nStrings.observations.add_observation;
    const pattern = i18nStrings.observations.input_pattern;
    const modalHtml = `
        <div class="modal fade" id="add-observation-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header py-1">
                        <h6 class="modal-title mb-0">${title}</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2">
                        <div class="border rounded mb-2" style="font-family: var(--bs-font-monospace, monospace); white-space: pre; background: #f8f9fa; padding: 4px 6px; font-size: 14px; color: #000;"><div id="obs-guide-header" style="margin: 0; padding: 0; line-height: 1.4;">${pattern}</div><div id="obs-guide-entered" style="margin: 0; padding: 0; line-height: 1.4;"></div><div id="obs-guide-caret" style="color:#0d6efd; margin: 0; padding: 0; line-height: 1.4;"></div></div>
                        <input id="obs-code-input" class="form-control form-control-sm py-1" autocomplete="off" spellcheck="false" style="position: absolute; left: -9999px; font-family: var(--bs-font-monospace, monospace); font-size: 14px;" placeholder="KKOJJMMTTgZZZZdDDNCcEEHFVfzzGG...">
                        <div id="obs-code-error" class="text-danger mt-1" style="display:none; font-size: 12px;"></div>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-add-obs-ok">${i18nStrings.common.ok}</button>
                    </div>
                </div>
            </div>
        </div>`;

    let observerCodes;
    let observers;
    try {
        const data = await loadObserverCodes();
        observerCodes = data.codeSet;
        observers = data.observers;
    } catch (e) {
        console.error(e);
        alert(i18nStrings.observations.error_loading_observers);
        return;
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('add-observation-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const input = document.getElementById('obs-code-input');
    const errEl = document.getElementById('obs-code-error');
    let eing = fixedObserver || '';  // Pre-fill with fixed observer KK

    // Focus input as soon as modal is shown
    modalEl.addEventListener('shown.bs.modal', () => {
        input.focus();
        // Set initial value and render
        input.value = eing;
        renderNumericGuide(eing);
    });

    // Enter key triggers OK button
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-add-obs-ok').click();
        }
    });

    function renderNumericGuide(s) {
        const enteredEl = document.getElementById('obs-guide-entered');
        const caretEl = document.getElementById('obs-guide-caret');
        const max = Math.min(s.length, 110);  // Extended to show sectors + remarks (50 + 60)
        let formatted = '';
        for (let i = 0; i < max; i++) {
            formatted += s[i];
            // Add space after every 5 characters only up to position 34 (end of 8HHHH)
            if ((i + 1) % 5 === 0 && i < 34) formatted += ' ';
            // Add extra separator space after 8HHHH (pos 34) and after sectors (pos 49)
            if (i === 34 || i === 49) formatted += ' ';
        }
        enteredEl.textContent = formatted;
        // caret position accounts for inserted spaces
        const L = max;
        let spacesBefore = L <= 34 ? Math.floor(L / 5) : Math.floor(34 / 5);
        if (L > 34) spacesBefore += 1; // separator after 8HHHH
        if (L > 49) spacesBefore += 1; // separator after sectors
        const caretPos = L + spacesBefore;
        caretEl.textContent = ' '.repeat(Math.max(caretPos, 0)) + '^';
    }

    // initial render
    renderNumericGuide(eing);

    input.addEventListener('keydown', (ev) => {
        // Allow navigation keys
        const navKeys = ['ArrowLeft','ArrowRight','Home','End','Tab'];
        if (navKeys.includes(ev.key)) return;
        if (ev.key === 'Backspace') {
            if (eing.length > 0) {
                eing = eing.slice(0, -1);
                input.value = eing;
                renderNumericGuide(eing);
            }
            ev.preventDefault();
            return;
        }
        // Only accept single character entries
        if (ev.key.length !== 1) return;
        const ch = ev.key;
        // Convert to lowercase in sector field (positions 36-50 need lowercase a-h)
        const inSectorField = eing.length >= 35 && eing.length < 50;
        let candidate = eing + (inSectorField ? ch.toLowerCase() : ch);
        
        console.log(`[DEBUG] Key pressed: '${ch}', eing.length: ${eing.length}, candidate.length: ${candidate.length}`);
        
        // Auto-fill GG when g=0 or g=2 (after zz complete at position 28)
        if (candidate.length === 28) {
            const g = parseInt(candidate.slice(9,10),10);
            console.log(`[DEBUG] Checking GG auto-fill: g=${g}, candidate.length=${candidate.length}`);
            if (g === 0 || g === 2) {
                console.log(`[DEBUG] GG auto-fill triggered! g=${g}`);
                
                // First validate and add the character the user just typed
                const result = validateNumericProgress(candidate, observerCodes);
                if (!result.ok) {
                    if (result.reset) {
                        eing = '';
                        input.value = eing;
                        errEl.textContent = result.msg;
                        errEl.style.display = 'block';
                        renderNumericGuide(eing);
                    } else {
                        errEl.textContent = result.msg;
                        errEl.style.display = 'block';
                    }
                    ev.preventDefault();
                    return;
                }
                
                // Add the validated character to eing
                eing = candidate;
                input.value = eing;
                errEl.style.display = 'none';
                renderNumericGuide(eing);
                
                // Now fetch and auto-fill GG
                const kk = eing.slice(0,2);
                const jj = eing.slice(3,5);
                const mm = eing.slice(5,7);
                
                // Fetch observer's region for this specific time period via API
                fetch(`/api/observers?kk=${kk}&jj=${jj}&mm=${mm}`)
                    .then(response => response.json())
                    .then(data => {
                        const observer = data.observer;
                        console.log(`[DEBUG] Observer found for ${kk} at ${mm}/${jj}:`, observer);
                        
                        if (observer) {
                            // Get region - use GH for main site (g=0), GN for secondary site (g=2)
                            let gg = g === 0 ? observer.GH : observer.GN;
                            console.log(`[DEBUG] Observer geographic region field: ${gg}`);
                            if (gg !== null && gg !== undefined) {
                                gg = String(gg).padStart(2,'0');
                                console.log(`[DEBUG] Adding GG: ${gg}`);
                                // Auto-fill the GG field
                                eing = eing + gg;
                                input.value = eing;
                                renderNumericGuide(eing);
                                
                                // Auto-fill 8HHHH sun pillar altitude field after GG
                                const ee = parseInt(eing.slice(20,22),10);
                                console.log(`[DEBUG] Auto-filling 8HHHH for EE=${ee}`);
                                if (ee === 8) {
                                    // EE 08: user enters 2 digits, then // auto-filled → 8??//
                                    eing = eing + '8';
                                } else if (ee === 9) {
                                    // EE 09: one slash, user enters 2 digits, one slash → 8//??  
                                    eing = eing + '8/';
                                } else if (ee === 10) {
                                    // EE 10: user enters all 4 digits → 8????
                                    eing = eing + '8';
                                } else {
                                    // All other EE values: no sun pillar → 8////
                                    eing = eing + '8////';
                                }
                                input.value = eing;
                                renderNumericGuide(eing);
                                
                                // Auto-fill sectors after 8HHHH is complete
                                // Sectors are only needed for incomplete (V=1) circular halos
                                const v = parseInt(eing.slice(24,25),10);
                                const circularHalos = new Set([1,7,12,31,32,33,34,35,36,40]);
                                console.log(`[DEBUG] Auto-filling sectors: EE=${ee}, V=${v}, isCircular=${circularHalos.has(ee)}`);
                                
                                if (v === 1 && circularHalos.has(ee)) {
                                    // Incomplete circular halo: user will enter sectors (do nothing)
                                    console.log(`[DEBUG] Incomplete circular halo - user will enter sectors`);
                                } else {
                                    // Complete halo or non-circular: auto-fill 15 spaces
                                    console.log(`[DEBUG] Auto-filling 15 spaces for sectors`);
                                    eing = eing + '               ';
                                    input.value = eing;
                                    renderNumericGuide(eing);
                                }
                            }
                        }
                    })
                    .catch(err => {
                        console.error(`[ERROR] Failed to fetch observer data:`, err);
                    });
                
                ev.preventDefault();
                return;
            }
            // If g=1, fall through to normal validation (manual GG entry)
        }
        
        // Auto-fill 8HHHH sun pillar altitude field after GG (position 29 complete)
        if (eing.length === 29) {
            const ee = parseInt(eing.slice(20,22),10);
            if (ee === 8) {
                // EE 08: user enters 2 digits, then // auto-filled → 8??//
                candidate = candidate + '8';
            } else if (ee === 9) {
                // EE 09: one slash, user enters 2 digits, one slash → 8//??  
                candidate = candidate + '8/';
            } else if (ee === 10) {
                // EE 10: user enters all 4 digits → 8????
                candidate = candidate + '8';
            } else {
                // All other EE values: no sun pillar → 8////
                candidate = candidate + '8////';
            }
        }
        
        // Auto-fill sectors after 8HHHH is complete (position 34 complete)
        // Sectors are only needed for incomplete (V=1) circular halos
        if (eing.length === 34) {
            const v = parseInt(eing.slice(24,25),10);
            const ee = parseInt(eing.slice(20,22),10);
            const circularHalos = new Set([1,7,12,31,32,33,34,35,36,40]);
            
            if (v === 1 && circularHalos.has(ee)) {
                // Incomplete circular halo: user will enter sectors (do nothing)
            } else {
                // Complete halo or non-circular: auto-fill 15 spaces
                candidate = candidate + '               ';
            }
        }
        
        // Handle space key in sector field to complete and fill remaining with spaces
        // Space is just a trigger, not added as a character
        if (eing.length >= 35 && eing.length < 50 && ch === ' ') {
            const v = parseInt(eing.slice(24,25),10);
            const ee = parseInt(eing.slice(20,22),10);
            const circularHalos = new Set([1,7,12,31,32,33,34,35,36,40]);
            
            if (v === 1 && circularHalos.has(ee)) {
                const sectorStart = 35;
                const posInSector = eing.length - sectorStart;
                
                console.log(`[DEBUG] Space trigger: posInSector=${posInSector}, mod 2=${posInSector % 2}`);
                // Only allow space at odd length (ends with letter)
                if (posInSector % 2 === 1) {
                    // Valid end position - fill rest with spaces to complete 15-char sector field
                    // Sector field is positions 35-49 (15 chars), remarks start at position 50
                    const spacesNeeded = (35 + 15) - eing.length;
                    console.log(`[DEBUG] Completing sector field with ${spacesNeeded} spaces (eing.length=${eing.length})`);
                    candidate = eing + ' '.repeat(spacesNeeded);
                }
            }
        }
        
        const result = validateNumericProgress(candidate, observerCodes);
        if (result.ok) {
            eing = candidate;
            input.value = eing;
            errEl.style.display = 'none';
            renderNumericGuide(eing);
        } else if (result.reset) {
            eing = '';
            input.value = '';
            errEl.style.display = 'none';
            renderNumericGuide(eing);
        } else if (result.backtrack) {
            // Remove specified number of characters when 2-digit field validation fails
            eing = eing.slice(0, -result.backtrack);
            input.value = eing;
            renderNumericGuide(eing);
        }
        // ignore invalid by preventing default
        ev.preventDefault();
    });

    document.getElementById('btn-add-obs-ok').addEventListener('click', async () => {
        try {
            const obs = parseNumericObservation(eing);
            if (!obs) {
                errEl.textContent = i18nStrings.observations.input_incomplete;
                errEl.style.display = 'block';
                return;
            }
            const resp = await fetch('/api/observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(obs)
            });
            if (!resp.ok) throw new Error(i18nStrings.observations.error_adding);
            
            const addedObs = await resp.json();
            
            // Add to observations array and set dirty flag
            window.haloData.observations.push(addedObs);
            window.haloData.isDirty = true;
            saveHaloDataToSession();  // Sync to sessionStorage
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
            
            // Trigger autosave
            await triggerAutosave();
            
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success notification
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            const obsText = currentLanguage === 'de' ? 'Beobachtung' : 'Observation';
            const addedText = currentLanguage === 'de' ? 'hinzugefügt' : 'added';
            successMsg.innerHTML = `
                <strong>✓</strong> 1 ${obsText} ${addedText}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    });

    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Menu-based entry (Langeingabe) dialog
async function showAddObservationDialogMenu() {
    // Check if a file is loaded
    if (!window.haloData.isLoaded) {
        showWarningModal(i18nStrings.menus?.observations?.no_file_loaded || 'Please load or create a file first.');
        return;
    }

    // Load observer codes
    let observerCodes, observers;
    try {
        const data = await loadObserverCodes();
        observerCodes = data.codeSet;
        observers = data.observers;
    } catch (e) {
        console.error(e);
        alert(i18nStrings.observations.error_loading_observers);
        return;
    }
    
    // Get fixed observer setting
    let fixedObserver = '';
    try {
        const configResponse = await fetch('/api/config/fixed_observer');
        const config = await configResponse.json();
        fixedObserver = config.observer || '';
    } catch (e) {
        console.error('Error loading fixed observer:', e);
    }

    const title = i18nStrings.menus?.observations?.add_observation;
    
    // Build observer options with fixed observer pre-selected
    const observerOptions = observers.map(obs => {
        const selected = obs.KK === fixedObserver ? 'selected' : '';
        return `<option value="${obs.KK}" ${selected}>${obs.KK} - ${obs.VName || ''} ${obs.NName || ''}</option>`;
    }).join('');
    
    // Build year options (1950-2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 50 + i; // 50-149
        const displayYear = year < 50 ? 2000 + year : 1900 + year;
        return `<option value="${year}">${displayYear}</option>`;
    }).join('');
    
    const modalHtml = `
        <div class="modal fade" id="add-observation-menu-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header py-1">
                        <h6 class="modal-title mb-0">${title}</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2">
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label">KK - ${i18nStrings.fields?.observer} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-kk" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    ${observerOptions}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">O - ${i18nStrings.fields?.object} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-o" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    <option value="1">1 - ${i18nStrings.object_types?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.object_types?.['2']}</option>
                                    <option value="3">3 - ${i18nStrings.object_types?.['3']}</option>
                                    <option value="4">4 - ${i18nStrings.object_types?.['4']}</option>
                                    <option value="5">5 - ${i18nStrings.object_types?.['5']}</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">JJ - ${i18nStrings.fields?.year} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-jj" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    ${yearOptions}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">MM - ${i18nStrings.fields?.month} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-mm" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    ${Array.from({length: 12}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">TT - ${i18nStrings.fields?.day} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-tt" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    ${Array.from({length: 31}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">g - ${i18nStrings.fields?.observing_area} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-g" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    <option value="0">0 - ${i18nStrings.location_types?.['0']}</option>
                                    <option value="1">1 - ${i18nStrings.location_types?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.location_types?.['2']}</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">ZS - ${i18nStrings.fields?.hour}</label>
                                <select class="form-select form-select-sm" id="menu-zs">
                                    <option value="">--</option>
                                    ${Array.from({length: 24}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">ZM - ${i18nStrings.fields?.minute}</label>
                                <select class="form-select form-select-sm" id="menu-zm">
                                    <option value="">--</option>
                                    ${Array.from({length: 60}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">d - ${i18nStrings.fields?.cirrus_density}</label>
                                <select class="form-select form-select-sm" id="menu-d">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    <option value="0">0 - ${i18nStrings.cirrus_density?.['0']}</option>
                                    <option value="1">1 - ${i18nStrings.cirrus_density?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.cirrus_density?.['2']}</option>
                                    <option value="4">4 - ${i18nStrings.cirrus_density?.['4']}</option>
                                    <option value="5">5 - ${i18nStrings.cirrus_density?.['5']}</option>
                                    <option value="6">6 - ${i18nStrings.cirrus_density?.['6']}</option>
                                    <option value="7">7 - ${i18nStrings.cirrus_density?.['7']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">DD - ${i18nStrings.fields?.duration}</label>
                                <select class="form-select form-select-sm" id="menu-dd">
                                    <option value="-1">--</option>
                                    ${Array.from({length: 100}, (_, i) => `<option value="${i}">${i * 10} min</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">N - ${i18nStrings.fields?.cloud_cover}</label>
                                <select class="form-select form-select-sm" id="menu-n">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 10}, (_, i) => {
                                        const label = i18nStrings.cloud_cover?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">C - ${i18nStrings.fields?.cirrus_type}</label>
                                <select class="form-select form-select-sm" id="menu-C">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 8}, (_, i) => {
                                        const label = i18nStrings.cirrus_types?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">c - ${i18nStrings.fields?.low_clouds}</label>
                                <select class="form-select form-select-sm" id="menu-c">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 10}, (_, i) => {
                                        const label = i18nStrings.low_clouds?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">EE - ${i18nStrings.fields?.phenomenon} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-ee" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    ${Array.from({length: 77}, (_, i) => {
                                        const ee = i + 1;
                                        const label = i18nStrings.halo_types?.[ee.toString()];
                                        return `<option value="${ee}">${String(ee).padStart(2, '0')} - ${label}</option>`;
                                    }).join('')}
                                    <option value="99">99 - ${i18nStrings.halo_types?.['99']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">H - ${i18nStrings.fields?.brightness}</label>
                                <select class="form-select form-select-sm" id="menu-h">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 4}, (_, i) => {
                                        const label = i18nStrings.brightness?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">F - ${i18nStrings.fields?.color}</label>
                                <select class="form-select form-select-sm" id="menu-f">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 6}, (_, i) => {
                                        const label = i18nStrings.color?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">V - ${i18nStrings.fields?.completeness}</label>
                                <select class="form-select form-select-sm" id="menu-v">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    <option value="1">1 - ${i18nStrings.completeness?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.completeness?.['2']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">f - ${i18nStrings.fields?.weather_front}</label>
                                <select class="form-select form-select-sm" id="menu-f">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 9}, (_, i) => {
                                        const label = i18nStrings.weather_front?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">zz - ${i18nStrings.fields?.precipitation}</label>
                                <select class="form-select form-select-sm" id="menu-zz">
                                    <option value="-1">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 99}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')} h</option>`).join('')}
                                    <option value="99">99 - ${i18nStrings.precipitation?.['99']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">GG - ${i18nStrings.fields?.region} <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="menu-gg" required>
                                    <option value="">-- ${i18nStrings.fields?.select} --</option>
                                    ${[1,2,3,4,5,6,7,8,9,10,11,16,17,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39].map(gg => {
                                        const label = i18nStrings.geographic_regions?.[gg.toString()];
                                        return `<option value="${gg}">${String(gg).padStart(2, '0')} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="row g-1">
                                    <div class="col-6">
                                        <label class="form-label">8HO (obere Lichtsäule)</label>
                                        <select class="form-select form-select-sm" id="menu-ho">
                                            <option value="-1">--</option>
                                            ${Array.from({length: 90}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}°</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label">HU (untere Lichtsäule)</label>
                                        <select class="form-select form-select-sm" id="menu-hu">
                                            <option value="-1">--</option>
                                            ${Array.from({length: 90}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}°</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="form-label">${i18nStrings.fields?.sectors} (${i18nStrings.fields?.max_15_chars})</label>
                                <input type="text" class="form-control form-control-sm" id="menu-sectors" maxlength="15">
                            </div>
                            <div class="col-12">
                                <label class="form-label">${i18nStrings.fields?.remarks} (${i18nStrings.fields?.max_60_chars})</label>
                                <input type="text" class="form-control form-control-sm" id="menu-remarks" maxlength="60">
                            </div>
                        </div>
                        <div class="alert alert-danger mt-2" id="menu-obs-error" style="display:none;"></div>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${i18nStrings.common?.cancel}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-add-obs-menu-ok" disabled>${i18nStrings.common?.ok}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('add-observation-menu-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const errEl = document.getElementById('menu-obs-error');
    const okBtn = document.getElementById('btn-add-obs-menu-ok');
    
    // Get all fields
    const fields = {
        kk: document.getElementById('menu-kk'),
        o: document.getElementById('menu-o'),
        jj: document.getElementById('menu-jj'),
        mm: document.getElementById('menu-mm'),
        tt: document.getElementById('menu-tt'),
        g: document.getElementById('menu-g'),
        zs: document.getElementById('menu-zs'),
        zm: document.getElementById('menu-zm'),
        d: document.getElementById('menu-d'),
        dd: document.getElementById('menu-dd'),
        n: document.getElementById('menu-n'),
        C: document.getElementById('menu-C'),
        c: document.getElementById('menu-c'),
        ee: document.getElementById('menu-ee'),
        h: document.getElementById('menu-h'),
        f: document.getElementById('menu-f'),
        v: document.getElementById('menu-v'),
        zz: document.getElementById('menu-zz'),
        gg: document.getElementById('menu-gg'),
        ho: document.getElementById('menu-ho'),
        hu: document.getElementById('menu-hu'),
        sectors: document.getElementById('menu-sectors'),
        remarks: document.getElementById('menu-remarks')
    };
    
    // Check required fields and enable/disable OK button
    function checkRequired() {
        const required = ['kk', 'o', 'jj', 'mm', 'tt', 'g', 'ee', 'gg'];
        const allFilled = required.every(key => fields[key].value !== '');
        okBtn.disabled = !allFilled;
    }
    
    // Auto-fill GG when g is selected
    async function autoFillGG() {
        const g = parseInt(fields.g.value);
        console.log('[DEBUG autoFillGG] Called with g:', g);
        console.log('[DEBUG autoFillGG] KK:', fields.kk.value, 'JJ:', fields.jj.value, 'MM:', fields.mm.value);
        
        if (g === 0 || g === 2) {
            // Auto-fill GG based on observer and date
            const kk = fields.kk.value;
            const jjRaw = fields.jj.value;
            const mm = fields.mm.value;
            console.log('[DEBUG autoFillGG] g is 0 or 2, checking if we have KK/JJ/MM');
            if (kk && jjRaw && mm) {
                // Convert year to 2-digit format (126 -> 26, 86 -> 86)
                const jj = parseInt(jjRaw) % 100;
                const url = `/api/observers?kk=${kk}&jj=${jj}&mm=${mm}`;
                console.log('[DEBUG autoFillGG] Fetching observer data from API:', url);
                try {
                    const resp = await fetch(url);
                    console.log('[DEBUG autoFillGG] API response status:', resp.status);
                    if (resp.ok) {
                        const data = await resp.json();
                        console.log('[DEBUG autoFillGG] API data received:', data);
                        console.log('[DEBUG autoFillGG] data.observer:', data.observer);
                        if (data.observer) {
                            console.log('[DEBUG autoFillGG] data.observer.GH:', data.observer.GH);
                            console.log('[DEBUG autoFillGG] data.observer.GN:', data.observer.GN);
                        }
                        if (data.observer && data.observer.GH !== undefined && data.observer.GN !== undefined) {
                            const gg = g === 0 ? data.observer.GH : data.observer.GN;
                            console.log('[DEBUG autoFillGG] Setting GG to:', gg, '(g=', g, ')');
                            fields.gg.value = gg;
                            fields.gg.disabled = true;
                            checkRequired();
                        } else {
                            console.log('[DEBUG autoFillGG] GH or GN not in data.observer');
                        }
                    } else {
                        console.log('[DEBUG autoFillGG] API response not OK');
                    }
                } catch (e) {
                    console.error('[DEBUG autoFillGG] Error fetching observer GG:', e);
                }
            } else {
                console.log('[DEBUG autoFillGG] Missing KK, JJ, or MM');
            }
        } else {
            console.log('[DEBUG autoFillGG] g is not 0 or 2, clearing GG');
            fields.gg.disabled = false;
            fields.gg.value = '';
        }
        checkRequired();
    }
    
    fields.g.addEventListener('change', autoFillGG);
    fields.kk.addEventListener('change', autoFillGG);
    fields.jj.addEventListener('change', autoFillGG);
    fields.mm.addEventListener('change', autoFillGG);
    
    // Auto-fill 8HHHH when EE is selected
    fields.ee.addEventListener('change', () => {
        const ee = parseInt(fields.ee.value);
        if (ee && ![8, 9, 10].includes(ee)) {
            // For non-pillar halos, set both to "not specified"
            fields.ho.value = '-1';
            fields.hu.value = '-1';
            fields.ho.disabled = true;
            fields.hu.disabled = true;
        } else {
            // For pillar halos (8, 9, 10), enable the fields
            fields.ho.disabled = false;
            fields.hu.disabled = false;
            if (ee === 8) {
                // Upper pillar only
                fields.ho.disabled = false;
                fields.hu.value = '-1';
                fields.hu.disabled = true;
            } else if (ee === 9) {
                // Lower pillar only
                fields.ho.value = '-1';
                fields.ho.disabled = true;
                fields.hu.disabled = false;
            } else if (ee === 10) {
                // Both pillars
                fields.ho.disabled = false;
                fields.hu.disabled = false;
            }
        }
    });
    
    // Auto-fill sectors when EE or V change
    function checkSectorsAutoFill() {
        const ee = parseInt(fields.ee.value);
        const v = parseInt(fields.v.value);
        const circularHalos = [1, 7, 12, 31, 32, 33, 34, 35, 36, 40];
        
        // Sectors are only relevant for circular halos
        if (ee && circularHalos.includes(ee)) {
            // Circular halo - enable sectors field
            if (v === 1) {
                // Incomplete - sectors field is editable
                fields.sectors.value = '';
                fields.sectors.disabled = false;
            } else if (v === 2) {
                // Complete - sectors not applicable, disable
                fields.sectors.value = '';
                fields.sectors.disabled = true;
            } else {
                // V not specified yet - allow editing
                fields.sectors.value = '';
                fields.sectors.disabled = false;
            }
        } else {
            // Non-circular halo - sectors field is empty and disabled
            fields.sectors.value = '';
            fields.sectors.disabled = true;
        }
    }
    fields.ee.addEventListener('change', checkSectorsAutoFill);
    fields.v.addEventListener('change', checkSectorsAutoFill);
    
    // Validate sectors field - delete invalid input
    fields.sectors.addEventListener('input', (e) => {
        const result = validateSectorInput(e.target.value, true);
        e.target.value = result.cleaned;
    });
    
    // Listen to all required fields
    ['kk', 'o', 'jj', 'mm', 'tt', 'g', 'ee', 'gg'].forEach(key => {
        fields[key].addEventListener('change', checkRequired);
    });
    
    // ESC key closes modal
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.hide();
        }
    });
    
    // Enter key triggers OK (if enabled)
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !okBtn.disabled) {
            e.preventDefault();
            okBtn.click();
        }
    });
    
    // OK button handler
    okBtn.addEventListener('click', async () => {
        try {
            const obs = {
                k: parseInt(fields.kk.value),
                o: parseInt(fields.o.value),
                j: parseInt(fields.jj.value),
                m: parseInt(fields.mm.value),
                t: parseInt(fields.tt.value),
                g: parseInt(fields.g.value),
                gg: parseInt(fields.gg.value),
                e: parseInt(fields.ee.value),
                zs: fields.zs.value ? parseInt(fields.zs.value) : 99,
                zm: fields.zm.value ? parseInt(fields.zm.value) : 99,
                d: fields.d.value ? parseInt(fields.d.value) : -1,
                dd: fields.dd.value ? parseInt(fields.dd.value) : -1,
                n: fields.n.value ? parseInt(fields.n.value) : -1,
                C: fields.C.value ? parseInt(fields.C.value) : -1,
                c: fields.c.value ? parseInt(fields.c.value) : -1,
                h: fields.h.value ? parseInt(fields.h.value) : -1,
                f: fields.f.value ? parseInt(fields.f.value) : -1,
                v: fields.v.value ? parseInt(fields.v.value) : -1,
                zz: fields.zz.value && fields.zz.value !== '-1' ? parseInt(fields.zz.value) : -1,
                sectors: fields.sectors.value || '',
                remarks: fields.remarks.value || ''
            };
            
            // Add pillar heights if specified
            if (fields.ho.value && fields.ho.value !== '-1') {
                obs.HO = parseInt(fields.ho.value);
            }
            if (fields.hu.value && fields.hu.value !== '-1') {
                obs.HU = parseInt(fields.hu.value);
            }
            
            const resp = await fetch('/api/observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(obs)
            });
            
            if (!resp.ok) throw new Error(i18nStrings.observations.error_adding);
            
            const addedObs = await resp.json();
            
            // Add to observations array and set dirty flag
            window.haloData.observations.push(addedObs);
            window.haloData.isDirty = true;
            saveHaloDataToSession();  // Sync to sessionStorage
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
            
            // Trigger autosave
            await triggerAutosave();
            
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success notification
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            const obsText = currentLanguage === 'de' ? 'Beobachtung' : 'Observation';
            const addedText = currentLanguage === 'de' ? 'hinzugefügt' : 'added';
            successMsg.innerHTML = `
                <strong>✓</strong> 1 ${obsText} ${addedText}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Validate sector field - shared validation logic for both entry modes
// Returns: { valid: true, cleaned: string } or { valid: false, error: string }
function validateSectorInput(value, deleteInvalid = false) {
    let cleaned = '';
    const used = new Set();
    
    for (let i = 0; i < value.length; i++) {
        const ch = value[i].toLowerCase();
        const posInCleaned = cleaned.length;
        const isOddPos = (posInCleaned % 2 === 0);  // Letters at 0,2,4... separators at 1,3,5...
        
        if (ch === ' ') {
            // Space can end sector input if at odd position (after a letter)
            if (posInCleaned % 2 === 1) {
                // Valid completion - stop here
                return { valid: true, cleaned: cleaned };
            }
            // Invalid space position
            if (deleteInvalid) continue; // Skip it
            return { valid: false, error: 'Space only allowed after letter' };
        }
        
        if (isOddPos) {
            // Odd positions (0,2,4...): only letters a-h, each once
            if (!/[a-h]/.test(ch)) {
                if (deleteInvalid) continue;
                return { valid: false, error: 'Only letters a-h allowed' };
            }
            if (used.has(ch)) {
                if (deleteInvalid) continue;
                return { valid: false, error: `Letter '${ch}' already used` };
            }
            
            // If there was a separator before, validate succession rules
            if (cleaned.length >= 2) {
                const separator = cleaned[cleaned.length - 1];
                const prevLetter = cleaned[cleaned.length - 2];
                const letters = 'abcdefgh';
                const prevIdx = letters.indexOf(prevLetter);
                const currIdx = letters.indexOf(ch);
                const successorIdx = (prevIdx + 1) % 8;
                
                if (separator === '-') {
                    // Dash requires successor
                    if (currIdx !== successorIdx) {
                        if (deleteInvalid) continue;
                        return { valid: false, error: `After '${prevLetter}-' expected '${letters[successorIdx]}'` };
                    }
                } else if (separator === '/') {
                    // Slash requires non-successor
                    if (currIdx === successorIdx) {
                        if (deleteInvalid) continue;
                        return { valid: false, error: `After '${prevLetter}/' cannot use '${letters[successorIdx]}'` };
                    }
                }
            }
            
            cleaned += ch;
            used.add(ch);
        } else {
            // Even positions (1,3,5...): only - or /
            if (ch !== '-' && ch !== '/') {
                if (deleteInvalid) continue;
                return { valid: false, error: 'Only - or / allowed as separator' };
            }
            cleaned += ch;
        }
    }
    
    return { valid: true, cleaned: cleaned };
}

// Validate progressive numeric entry similar to Pascal Kurzeingabe
function validateNumericProgress(s, observerCodes) {
    const len = s.length;
    const digit = /[0-9]/;
    // 1-2 KK (00-99 or A? not enforced yet)
    if (len === 1) return { ok: /[A-Z0-9]/.test(s[0]) };
    if (len === 2) {
        const basic = /[0-9A-Z][0-9]/.test(s);
        if (!basic) return { ok: false };
        const code = s.slice(0,2).toUpperCase();
        if (observerCodes && !observerCodes.has(code)) {
            return { ok: false, reset: true };
        }
        return { ok: true };
    }
    // 3 O (1-5)
    if (len === 3) return { ok: digit.test(s[2]) && parseInt(s[2],10)>=1 && parseInt(s[2],10)<=5 };
    // 4-5 JJ
    if (len === 4) return { ok: digit.test(s[3]) };
    if (len === 5) return { ok: digit.test(s[4]) };
    // 6-7 MM (01-12)
    if (len === 6) return { ok: digit.test(s[5]) };
    if (len === 7) {
        const mm = parseInt(s.slice(5,7),10);
        return mm>=1 && mm<=12 ? { ok: true } : { ok: false, backtrack: 1 };
    }
    // 8-9 TT (01-31) – validate against month
    if (len === 8) return { ok: digit.test(s[7]) };
    if (len === 9) {
        const mm = parseInt(s.slice(5,7),10);
        const tt = parseInt(s.slice(7,9),10);
        if (tt < 1 || tt > 31) return { ok: false, backtrack: 1 };
        // Days per month (ignoring leap years for simplicity)
        const daysInMonth = [0,31,29,31,30,31,30,31,31,30,31,30,31];
        return tt <= daysInMonth[mm] ? { ok: true } : { ok: false, backtrack: 1 };
    }
    // 10 g (0-2)
    if (len === 10) return { ok: ['0','1','2'].includes(s[9]) };
    // 11-12 ZS (00-23) or '//'
    if (len === 11) return { ok: digit.test(s[10]) || s[10] === '/' };
    if (len === 12) {
        const zs = s.slice(10,12);
        if (zs === '//') return { ok: true };
        const v = parseInt(zs,10);
        return v>=0 && v<=23 ? { ok: true } : { ok: false, backtrack: 1 };
    }
    // 13-14 ZM (00-59) or '//'
    if (len === 13) return { ok: digit.test(s[12]) || s[12] === '/' };
    if (len === 14) {
        const zm = s.slice(12,14);
        if (zm === '//') return { ok: true };
        const v = parseInt(zm,10);
        return v>=0 && v<=59 ? { ok: true } : { ok: false, backtrack: 1 };
    }
    // 15 dd (0-7, not 3) or '/'
    if (len === 15) return { ok: ['0','1','2','4','5','6','7','/'].includes(s[14]) };
    // 16-17 D (00-99) or '//'
    if (len === 16) return { ok: digit.test(s[15]) || s[15] === '/' };
    if (len === 17) { const d = s.slice(15,17); return { ok: d === '//' || (/^\d{2}$/.test(d)) }; }
    // 18 N (0-9) or '/'
    if (len === 18) return { ok: (digit.test(s[17]) || s[17] === '/') };
    // 19 C (0-9) or '/'
    if (len === 19) return { ok: (digit.test(s[18]) || s[18] === '/') };
    // 20 c (low clouds, 0-9) or '/'
    if (len === 20) return { ok: (digit.test(s[19]) || s[19] === '/') };
    // 21-22 E (01-77 or 99)
    if (len === 21) return { ok: digit.test(s[20]) };
    if (len === 22) {
        const e = parseInt(s.slice(20,22),10);
        return (e>=1 && e<=77) || e===99 ? { ok: true } : { ok: false, backtrack: 1 };
    }
    // 23 H (0-3) or '/'
    if (len === 23) return { ok: ['0','1','2','3','/'].includes(s[22]) };
    // 24 F (0-5) or '/'
    if (len === 24) return { ok: ['0','1','2','3','4','5','/'].includes(s[23]) };
    // 25 V (1-2) or '/'
    if (len === 25) return { ok: ['1','2','/'].includes(s[24]) };
    // 26 f (weather front, digit or space)
    if (len === 26) return { ok: digit.test(s[25]) || s[25] === ' ' };
    // 27-28 zz (two digits) or '//' or '  '
    if (len === 27) return { ok: digit.test(s[26]) || s[26] === '/' || s[26] === ' ' };
    if (len === 28) {
        const zz = s.slice(26,28);
        return { ok: zz === '//' || zz === '  ' || /^\d{2}$/.test(zz) };
    }
    // 29-30 G (01-39, excluding 12-15 and 18)
    if (len === 29) return { ok: digit.test(s[28]) };
    if (len === 30) {
        const g = parseInt(s.slice(28,30),10);
        const invalidGG = [12, 13, 14, 15, 18];
        if (g < 1 || g > 39 || invalidGG.includes(g)) {
            return { ok: false, backtrack: 2 };
        }
        return { ok: true };
    }
    // 31-35 8HHHH sun pillar altitude (auto-filled based on EE)
    // EE 08: 8??// (user enters digits at 32-33)
    // EE 09: 8//?? (user enters digits at 33-34)  
    // EE 10: 8???? (user enters digits at 32-35)
    // Other EE: 8///// (all auto-filled)
    if (len === 31) return { ok: s[30] === '8' };
    if (len >= 32 && len <= 35) {
        const ee = parseInt(s.slice(20,22),10);
        const char = s[len-1];
        if (ee === 8) {
            // 8??//: positions 32-33 are digits, 34-35 are slashes
            if (len === 32 || len === 33) return { ok: digit.test(char) };
            if (len === 34 || len === 35) return { ok: char === '/' };
        } else if (ee === 9) {
            // 8//??:  position 32 is slash, 33-34 are digits, 35 is slash
            if (len === 32) return { ok: char === '/' };
            if (len === 33 || len === 34) return { ok: digit.test(char) };
            if (len === 35) return { ok: char === '/' };
        } else if (ee === 10) {
            // 8????: positions 32-35 are all digits
            return { ok: digit.test(char) };
        } else {
            // 8/////: all slashes already auto-filled
            return { ok: char === '/' };
        }
    }
    // 36-50 Sectors (15 characters)
    // Only for incomplete (V=1) circular halos from set [1,7,12,31,32,33,34,35,36,40]
    // Otherwise auto-filled with 15 spaces
    if (len >= 36 && len <= 50) {
        const v = parseInt(s.slice(24,25),10);
        const ee = parseInt(s.slice(20,22),10);
        const circularHalos = new Set([1,7,12,31,32,33,34,35,36,40]);
        const char = s[len-1];
        
        console.log(`[SECTOR DEBUG] len=${len}, v=${v}, ee=${ee}, char='${char}', isCircular=${circularHalos.has(ee)}`);
        
        if (v === 1 && circularHalos.has(ee)) {
            // User enters sector notation using shared validator
            const sectorStart = 35;
            const sectorField = s.slice(sectorStart, len);
            
            console.log(`[SECTOR DEBUG] sectorField='${sectorField}'`);
            
            // Use shared validation function
            const result = validateSectorInput(sectorField, false);
            
            if (!result.valid) {
                console.log(`[SECTOR DEBUG] Validation failed: ${result.error}`);
                return { ok: false };
            }
            
            console.log(`[SECTOR DEBUG] Validation passed`);
            return { ok: true };
        } else {
            // Auto-filled spaces
            console.log(`[SECTOR DEBUG] Auto-filled space expected`);
            return { ok: char === ' ' };
        }
    }
    // Accept anything after for remarks
    return { ok: true };
}

// Parse numeric observation string into JSON payload
function parseNumericObservation(s) {
    if (s.length < 30) return null;
    const toInt = (x) => (x === '/' || x === ' ' ? -1 : parseInt(x,10));
    const obs = {
        KK: parseInt(s.slice(0,2),10),
        O: parseInt(s.slice(2,3),10),
        JJ: parseInt(s.slice(3,5),10),
        MM: parseInt(s.slice(5,7),10),
        TT: parseInt(s.slice(7,9),10),
        g: parseInt(s.slice(9,10),10),
        ZS: (s.slice(10,12) === '//' ? -1 : parseInt(s.slice(10,12),10)),
        ZM: (s.slice(12,14) === '//' ? -1 : parseInt(s.slice(12,14),10)),
        d: toInt(s.slice(14,15)),
        DD: (s.slice(15,17) === '//' ? -1 : parseInt(s.slice(15,17),10)),
        N: toInt(s.slice(17,18)),
        C: toInt(s.slice(18,19)),
        c: toInt(s.slice(19,20)),
        EE: parseInt(s.slice(20,22),10),
        H: toInt(s.slice(22,23)),
        F: toInt(s.slice(23,24)),
        V: toInt(s.slice(24,25)),
        f: (s.slice(25,26).trim() === '' ? -1 : toInt(s.slice(25,26))),
        zz: (s.slice(26,28) === '//' ? 99 : (s.slice(26,28) === '  ' ? -1 : parseInt(s.slice(26,28),10))),
        GG: parseInt(s.slice(28,30),10),
        HO: -1,
        HU: -1,
        sectors: '',
        remarks: ''
    };
    // Optional 8HHHH field
    if (s.length >= 35 && s[30] === '8') {
        const hoPart = s.slice(31,33);
        const huPart = s.slice(33,35);
        obs.HO = (hoPart === '//' ? -1 : parseInt(hoPart,10));
        obs.HU = (huPart === '//' ? -1 : parseInt(huPart,10));
    }
    // Remaining content: sectors (up to first space) and remark
    if (s.length > 35) {
        const rest = s.slice(35);
        obs.sectors = rest.split(' ')[0].slice(0,15);
        obs.remarks = rest.slice(obs.sectors.length).trim().slice(0,60);
    }
    return obs;
}



// Load internationalization strings
async function loadI18n(lang) {
    try {
        const response = await fetch(`/api/i18n/${lang}`);
        i18nStrings = await response.json();
        updatePageText();
    } catch (error) {
        console.error('Failed to load i18n strings:', error);
    }
}

// Update page text with current language
function updatePageText() {
    // Note: With server-side rendering, the page is already in the correct language
    // This function is now redundant since we reload the page on language switch
    // Keeping it for compatibility but it does nothing
    // The templates use {% if lang() == 'de' %}...{% endif %} for proper server-side rendering
}

// Setup language switcher buttons
// Setup language switcher buttons
function setupLanguageSwitcher() {
    const deBtn = document.getElementById('lang-de');
    const enBtn = document.getElementById('lang-en');
    
    // Set initial button states based on current language
    if (currentLanguage === 'de') {
        deBtn?.classList.remove('btn-outline-light');
        deBtn?.classList.add('btn-light');
        enBtn?.classList.remove('btn-light');
        enBtn?.classList.add('btn-outline-light');
    } else {
        enBtn?.classList.remove('btn-outline-light');
        enBtn?.classList.add('btn-light');
        deBtn?.classList.remove('btn-light');
        deBtn?.classList.add('btn-outline-light');
    }
    
    if (deBtn) {
        deBtn.addEventListener('click', () => switchLanguage('de'));
    }
    
    if (enBtn) {
        enBtn.addEventListener('click', () => switchLanguage('en'));
    }
}

// Switch language
async function switchLanguage(lang) {
    try {
        // Update language on server (session)
        const response = await fetch(`/api/language/${lang}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to set language on server');
        }
        
        // Store in localStorage as backup
        localStorage.setItem('halo_language', lang);
        
        // Reload page to get server-rendered content in new language
        // This ensures all templates, menus, and content are properly translated
        window.location.reload();
        
    } catch (error) {
        console.error('Error switching language:', error);
    }
}

// Update menu text with current language
function updateMenuText() {
    const menus = i18nStrings.menus;
    
    // Update main menu titles (skip first one which is the help icon "≡")
    const menuTitles = document.querySelectorAll('.menu-title');
    
    if (currentLanguage === 'de') {
        const titles = ['≡', i18nStrings.menu_titles.file, i18nStrings.menu_titles.observations, i18nStrings.menu_titles.observers, i18nStrings.menu_titles.analysis, i18nStrings.menu_titles.output, i18nStrings.menu_titles.settings, i18nStrings.menu_titles.exit];
        menuTitles.forEach((title, i) => {
            if (titles[i] && i > 0) title.textContent = titles[i];
        });
        
        // Update dropdown menu items
        updateDropdownItem('help-version', i18nStrings.help.version);
        updateDropdownItem('help-new', i18nStrings.help.whats_new);
        updateDropdownItem('new-file', i18nStrings.menus.file.new_file);
        updateDropdownItem('adjust', i18nStrings.menus.file.adjust);
        updateDropdownItem('load', i18nStrings.menus.file.load);
        updateDropdownItem('select', i18nStrings.menus.file.select);
        updateDropdownItem('merge', i18nStrings.menus.file.merge);
        updateDropdownItem('save', i18nStrings.menus.file.save);
        updateDropdownItem('save-as', i18nStrings.menus.file.save_as);
        updateDropdownItem('export', i18nStrings.menus.file.export);
        updateDropdownItem('import', i18nStrings.menus.file.import);
        updateDropdownItem('obs-add', i18nStrings.observations.add);
        updateDropdownItem('obs-modify', i18nStrings.observations.modify);
        updateDropdownItem('obs-delete', i18nStrings.observations.delete);
        updateDropdownItem('observer-display', i18nStrings.observations.display);
        updateDropdownItem('observer-add', i18nStrings.observations.add);
        updateDropdownItem('observer-modify', i18nStrings.observations.modify);
        updateDropdownItem('observer-delete', i18nStrings.observations.delete);
        updateDropdownItem('analysis-one', i18nStrings.analysis.one_param);
        updateDropdownItem('analysis-two', i18nStrings.analysis.two_params);
        updateDropdownItem('analysis-load', i18nStrings.analysis.load);
        updateDropdownItem('output-monthly-report', i18nStrings.output.monthly_report);
        updateDropdownItem('output-monthly-stats', i18nStrings.output.monthly_stats);
        updateDropdownItem('output-yearly-stats', i18nStrings.output.yearly_stats);
        updateDropdownItem('settings-fixed-observer', i18nStrings.menus?.settings?.fixed_observer || 'fester Beobachter');
        updateDropdownItem('settings-eingabeart', i18nStrings.menus?.settings?.input_type || 'Eingabeart');
        updateDropdownItem('settings-datenpfad', i18nStrings.menus?.settings?.data_dir || 'Datenverzeichnis');
        if (i18nStrings.menus?.settings?.active_observers) {
            updateDropdownItem('settings-active-observers', i18nStrings.menus.settings.active_observers);
        }
        // Update link text for observations (has href, not data-action)
        const obsLink = document.querySelector('a[href="/observations"]');
        if (obsLink) obsLink.textContent = i18nStrings.observations.display;
        const returnLink = document.querySelector('a[href="/"]');
        if (returnLink) returnLink.textContent = i18nStrings.common.back_to_main;
    } else {
        // English mode - use same i18n strings
        // Update dropdown menu items
        updateDropdownItem('help-version', i18nStrings.help.version);
        updateDropdownItem('help-new', i18nStrings.help.whats_new);
        updateDropdownItem('new-file', i18nStrings.menus.file.new_file);
        updateDropdownItem('adjust', i18nStrings.menus.file.adjust);
        updateDropdownItem('load', i18nStrings.menus.file.load);
        updateDropdownItem('select', i18nStrings.menus.file.select);
        updateDropdownItem('merge', i18nStrings.menus.file.merge);
        updateDropdownItem('save', i18nStrings.menus.file.save);
        updateDropdownItem('save-as', i18nStrings.menus.file.save_as);
        updateDropdownItem('export', i18nStrings.menus.file.export);
        updateDropdownItem('import', i18nStrings.menus.file.import);
        updateDropdownItem('obs-add', i18nStrings.observations.add);
        updateDropdownItem('obs-modify', i18nStrings.observations.modify);
        updateDropdownItem('obs-delete', i18nStrings.observations.delete);
        updateDropdownItem('observer-display', i18nStrings.observations.display);
        updateDropdownItem('observer-add', i18nStrings.observations.add);
        updateDropdownItem('observer-modify', i18nStrings.observations.modify);
        updateDropdownItem('observer-delete', i18nStrings.observations.delete);
        updateDropdownItem('analysis-one', i18nStrings.analysis.one_param);
        updateDropdownItem('analysis-two', i18nStrings.analysis.two_params);
        updateDropdownItem('analysis-load', i18nStrings.analysis.load);
        updateDropdownItem('output-monthly-report', i18nStrings.output.monthly_report);
        updateDropdownItem('output-monthly-stats', i18nStrings.output.monthly_stats);
        updateDropdownItem('output-yearly-stats', i18nStrings.output.yearly_stats);
        updateDropdownItem('settings-fixed-observer', i18nStrings.menus?.settings?.fixed_observer || 'Fixed Observer');
        updateDropdownItem('settings-eingabeart', i18nStrings.menus?.settings?.input_type || 'Input Type');
        updateDropdownItem('settings-datenpfad', i18nStrings.menus?.settings?.data_dir || 'Data Path');
        if (i18nStrings.menus?.settings?.active_observers) {
            updateDropdownItem('settings-active-observers', i18nStrings.menus.settings.active_observers);
        }
        // Update link text for observations (has href, not data-action)
        const obsLink = document.querySelector('a[href="/observations"]');
        if (obsLink) obsLink.textContent = i18nStrings.observations.display;
        const returnLink = document.querySelector('a[href="/"]');
        if (returnLink) returnLink.textContent = i18nStrings.common.back_to_main;
    }
}

function updateDropdownItem(action, text) {
    const item = document.querySelector(`[data-action="${action}"]`);
    if (item) item.textContent = text;
}

// Show help
function showHelp() {
    // Prefer rich markdown help dialog over alerts
    showHelpDialog();
}

// Show Modify Observations dialog
async function showModifyObservationsDialog() {
    // Check if data is loaded
    if (!window.haloData || !window.haloData.isLoaded || !window.haloData.observations || window.haloData.observations.length === 0) {
        showWarningModal(i18nStrings.dialogs?.no_data?.message || 'Keine Daten geladen! Bitte laden Sie zuerst eine Datei.');
        return;
    }
    
    // Step 1: Ask user to select type (Einzelbeobachtungen or Beobachtungsgruppen)
    const title = i18nStrings.menus?.observations?.modify_type_title || 'Beobachtungen ändern';
    const einzelText = i18nStrings.menus?.observations?.modify_single || 'Einzelbeobachtungen';
    const gruppenText = i18nStrings.menus?.observations?.modify_groups || 'Beobachtungsgruppen';
    const questionText = i18nStrings.menus?.observations?.modify_type_question || 'Was möchten Sie ändern?';
    
    const modalHtml = `
        <div class="modal fade" id="modify-type-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3">${questionText}</p>
                        <div class="form-check form-check-inline mb-0">
                            <input class="form-check-input" type="radio" name="modify_type" id="modify-single" value="single" checked>
                            <label class="form-check-label" for="modify-single">${einzelText}</label>
                        </div>
                        <div class="form-check form-check-inline mb-0">
                            <input class="form-check-input" type="radio" name="modify_type" id="modify-groups" value="groups">
                            <label class="form-check-label" for="modify-groups">${gruppenText}</label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>
                        <button type="button" class="btn btn-primary" id="btn-modify-ok">${i18nStrings.common.ok}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('modify-type-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    // Handle OK button
    document.getElementById('btn-modify-ok').addEventListener('click', async () => {
        const selected = document.querySelector('input[name="modify_type"]:checked');
        const modifyType = selected ? selected.value : 'single';
        modal.hide();
        await showModifyFilterDialog(modifyType);
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Show filter dialog for modify observations
async function showModifyFilterDialog(modifyType) {
    // Initialize filter dialog
    const filterDialog = new FilterDialog();
    await filterDialog.initialize();
    
    // Show filter dialog with callbacks
    filterDialog.show(
        (filterState) => {
            // onApply callback - filters have been applied
            console.log('Filter applied for modify:', modifyType, filterState);
            
            if (modifyType === 'single') {
                showModifySingleObservations(filterState);
            } else {
                showModifyGroupObservations(filterState);
            }
        },
        () => {
            // onCancel callback - user cancelled
            console.log('Modify dialog cancelled');
        }
    );
}

// Show single observations for modification (one by one)
async function showModifySingleObservations(filterState) {
    // Apply filters to get filtered observations
    const filteredObs = applyFilterToObservations(filterState);
    
    if (filteredObs.length === 0) {
        showWarningModal(i18nStrings.ui?.messages?.no_observations || 'Keine Beobachtungen gefunden!');
        return;
    }
    
    console.log(`[DEBUG] Found ${filteredObs.length} observations to modify`);
    
    // Show observations one by one in edit form
    let currentIndex = 0;
    
    const showNextObservation = async () => {
        if (currentIndex >= filteredObs.length) {
            // All observations processed - return to main menu
            window.location.href = '/';
            return;
        }
        
        const obs = filteredObs[currentIndex];
        
        // Find the index of this observation in the full observations array
        const obsIndex = window.haloData.observations.indexOf(obs);
        
        // Show observation form directly with populated fields
        showObservationFormForEdit(obs, currentIndex + 1, filteredObs.length, () => {
            // After modification, return to main menu
            window.location.href = '/';
        }, () => {
            // User chose to skip this observation - show next
            currentIndex++;
            showNextObservation();
        }, obsIndex);
    };
    
    showNextObservation();
}

// Show group modification form - edit multiple observations at once
async function showModifyGroupObservations(filterState) {
    // Apply filters to get filtered observations
    const filteredObs = applyFilterToObservations(filterState);
    
    if (filteredObs.length === 0) {
        showWarningModal(i18nStrings.ui?.messages?.no_observations || 'Keine Beobachtungen gefunden!');
        return;
    }
    
    console.log(`[DEBUG] Found ${filteredObs.length} observations for group modification`);
    
    // Always show the menu-based modification form (regardless of current input mode)
    await showGroupModifyDialogMenu(filteredObs);
}

async function showGroupModifyDialogMenu(filteredObs) {
    // Load observer codes
    let observerCodes, observers;
    try {
        const data = await loadObserverCodes();
        observerCodes = data.codeSet;
        observers = data.observers;
    } catch (e) {
        console.error(e);
        alert(i18nStrings.observations.error_loading_observers);
        return;
    }

    const title = i18nStrings.menus?.observations?.modify_groups || 'Beobachtungsgruppen';
    
    // Build observer options - NO pre-selection
    const observerOptions = observers.map(obs => {
        return `<option value="${obs.KK}">${obs.KK} - ${obs.VName || ''} ${obs.NName || ''}</option>`;
    }).join('');
    
    // Build year options (1950-2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 50 + i; // 50-149
        const displayYear = year < 50 ? 2000 + year : 1900 + year;
        return `<option value="${year}">${displayYear}</option>`;
    }).join('');
    
    const modalHtml = `
        <div class="modal fade" id="modify-group-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header py-1">
                        <h6 class="modal-title mb-0">${title} (${filteredObs.length} ${i18nStrings.ui?.messages?.observations || 'Beobachtungen'})</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2">
                        <p class="text-muted small mb-2">Nur die ausgefüllten Felder werden bei allen gefilterten Beobachtungen geändert.</p>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label class="form-label">KK - ${i18nStrings.fields?.observer}</label>
                                <select class="form-select form-select-sm" id="group-kk">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${observerOptions}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">O - ${i18nStrings.fields?.object}</label>
                                <select class="form-select form-select-sm" id="group-o">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    <option value="1">1 - ${i18nStrings.object_types?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.object_types?.['2']}</option>
                                    <option value="3">3 - ${i18nStrings.object_types?.['3']}</option>
                                    <option value="4">4 - ${i18nStrings.object_types?.['4']}</option>
                                    <option value="5">5 - ${i18nStrings.object_types?.['5']}</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">JJ - ${i18nStrings.fields?.year}</label>
                                <select class="form-select form-select-sm" id="group-jj">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${yearOptions}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">MM - ${i18nStrings.fields?.month}</label>
                                <select class="form-select form-select-sm" id="group-mm">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 12}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">TT - ${i18nStrings.fields?.day}</label>
                                <select class="form-select form-select-sm" id="group-tt">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 31}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">g - ${i18nStrings.fields?.observing_area}</label>
                                <select class="form-select form-select-sm" id="group-g">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    <option value="0">0 - ${i18nStrings.location_types?.['0']}</option>
                                    <option value="1">1 - ${i18nStrings.location_types?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.location_types?.['2']}</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">ZS - ${i18nStrings.fields?.hour}</label>
                                <select class="form-select form-select-sm" id="group-zs">
                                    <option value="">--</option>
                                    ${Array.from({length: 24}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">ZM - ${i18nStrings.fields?.minute}</label>
                                <select class="form-select form-select-sm" id="group-zm">
                                    <option value="">--</option>
                                    ${Array.from({length: 60}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">d - ${i18nStrings.fields?.cirrus_density}</label>
                                <select class="form-select form-select-sm" id="group-d">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    <option value="0">0 - ${i18nStrings.cirrus_density?.['0']}</option>
                                    <option value="1">1 - ${i18nStrings.cirrus_density?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.cirrus_density?.['2']}</option>
                                    <option value="4">4 - ${i18nStrings.cirrus_density?.['4']}</option>
                                    <option value="5">5 - ${i18nStrings.cirrus_density?.['5']}</option>
                                    <option value="6">6 - ${i18nStrings.cirrus_density?.['6']}</option>
                                    <option value="7">7 - ${i18nStrings.cirrus_density?.['7']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">DD - ${i18nStrings.fields?.duration}</label>
                                <select class="form-select form-select-sm" id="group-dd">
                                    <option value="">--</option>
                                    ${Array.from({length: 100}, (_, i) => `<option value="${i}">${i * 10} min</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">N - ${i18nStrings.fields?.cloud_cover}</label>
                                <select class="form-select form-select-sm" id="group-n">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 10}, (_, i) => {
                                        const label = i18nStrings.cloud_cover?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">C - ${i18nStrings.fields?.cirrus_type}</label>
                                <select class="form-select form-select-sm" id="group-C">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 8}, (_, i) => {
                                        const label = i18nStrings.cirrus_types?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">c - ${i18nStrings.fields?.low_clouds}</label>
                                <select class="form-select form-select-sm" id="group-c">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 10}, (_, i) => {
                                        const label = i18nStrings.low_clouds?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">EE - ${i18nStrings.fields?.phenomenon}</label>
                                <select class="form-select form-select-sm" id="group-ee">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 77}, (_, i) => {
                                        const ee = i + 1;
                                        const label = i18nStrings.halo_types?.[ee.toString()];
                                        return `<option value="${ee}">${String(ee).padStart(2, '0')} - ${label}</option>`;
                                    }).join('')}
                                    <option value="99">99 - ${i18nStrings.halo_types?.['99']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">H - ${i18nStrings.fields?.brightness}</label>
                                <select class="form-select form-select-sm" id="group-h">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 4}, (_, i) => {
                                        const label = i18nStrings.brightness?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">F - ${i18nStrings.fields?.color}</label>
                                <select class="form-select form-select-sm" id="group-f">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 6}, (_, i) => {
                                        const label = i18nStrings.color?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">V - ${i18nStrings.fields?.completeness}</label>
                                <select class="form-select form-select-sm" id="group-v">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    <option value="1">1 - ${i18nStrings.completeness?.['1']}</option>
                                    <option value="2">2 - ${i18nStrings.completeness?.['2']}</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">f - ${i18nStrings.fields?.weather_front}</label>
                                <select class="form-select form-select-sm" id="group-wf">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 9}, (_, i) => {
                                        const label = i18nStrings.weather_front?.[i.toString()];
                                        return `<option value="${i}">${i} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">zz - ${i18nStrings.fields?.precipitation}</label>
                                <select class="form-select form-select-sm" id="group-zz">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${Array.from({length: 99}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')} h</option>`).join('')}
                                    <option value="99">99</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">GG - ${i18nStrings.fields?.region}</label>
                                <select class="form-select form-select-sm" id="group-gg">
                                    <option value="">-- ${i18nStrings.fields?.not_specified} --</option>
                                    ${[1,2,3,4,5,6,7,8,9,10,11,16,17,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39].map(gg => {
                                        const label = i18nStrings.geographic_regions?.[gg.toString()];
                                        return `<option value="${gg}">${String(gg).padStart(2, '0')} - ${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="row g-1">
                                    <div class="col-6">
                                        <label class="form-label">8HO (obere Lichtsäule)</label>
                                        <select class="form-select form-select-sm" id="group-ho">
                                            <option value="">--</option>
                                            ${Array.from({length: 90}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}°</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label">HU (untere Lichtsäule)</label>
                                        <select class="form-select form-select-sm" id="group-hu">
                                            <option value="">--</option>
                                            ${Array.from({length: 90}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}°</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="form-label">${i18nStrings.fields?.sectors} (${i18nStrings.fields?.max_15_chars})</label>
                                <input type="text" class="form-control form-control-sm" id="group-sectors" maxlength="15">
                            </div>
                            <div class="col-12">
                                <label class="form-label">${i18nStrings.fields?.remarks} (${i18nStrings.fields?.max_60_chars})</label>
                                <input type="text" class="form-control form-control-sm" id="group-remarks" maxlength="60">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${i18nStrings.common?.cancel}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-modify-group-ok">${i18nStrings.common?.ok}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('modify-group-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const okBtn = document.getElementById('btn-modify-group-ok');
    
    // Handle OK button
    okBtn.addEventListener('click', async () => {
        // Collect all filled fields
        const updates = {};
        
        const fieldMapping = {
            'group-kk': 'KK', 'group-o': 'O', 'group-jj': 'JJ', 'group-mm': 'MM', 'group-tt': 'TT',
            'group-g': 'g', 'group-zs': 'ZS', 'group-zm': 'ZM', 'group-d': 'd', 'group-dd': 'DD',
            'group-n': 'N', 'group-C': 'C', 'group-c': 'c', 'group-ee': 'EE', 'group-h': 'H',
            'group-f': 'F', 'group-v': 'V', 'group-wf': 'f', 'group-zz': 'zz', 'group-gg': 'GG',
            'group-ho': 'HO', 'group-hu': 'HU'
        };
        
        // Collect values from form fields
        for (const [fieldId, fieldName] of Object.entries(fieldMapping)) {
            const elem = document.getElementById(fieldId);
            if (elem && elem.value && elem.value !== '' && elem.value !== '-1') {
                updates[fieldName] = parseInt(elem.value);
            }
        }
        
        // Text fields
        const sectorsElem = document.getElementById('group-sectors');
        if (sectorsElem && sectorsElem.value) {
            updates['Sektoren'] = sectorsElem.value;
        }
        
        const remarksElem = document.getElementById('group-remarks');
        if (remarksElem && remarksElem.value) {
            updates['Bemerkungen'] = remarksElem.value;
        }
        
        // Check if at least one field was filled
        if (Object.keys(updates).length === 0) {
            showWarningModal('Bitte füllen Sie mindestens ein Feld aus.');
            return;
        }
        
        modal.hide();
        
        // Process bulk update
        await processBulkUpdate(filteredObs, updates);
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

async function processBulkUpdate(filteredObs, updates) {
    try {
        console.log(`[BULK UPDATE] Updating ${filteredObs.length} observations with:`, updates);
        console.log('[BULK UPDATE] First 3 observations:', filteredObs.slice(0, 3));
        
        // For each observation: delete old, create modified, add back
        const modifiedObservations = [];
        
        for (const obs of filteredObs) {
            // Create modified observation by merging updates
            const modifiedObs = {...obs, ...updates};
            modifiedObservations.push({original: obs, modified: modifiedObs});
        }
        
        console.log('[BULK UPDATE] Starting delete phase...');
        // Delete all original observations from server
        for (const {original} of modifiedObservations) {
            const deleteResp = await fetch('/api/observations/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(original)
            });
            
            if (!deleteResp.ok) {
                console.error('[BULK UPDATE] Failed to delete observation:', original);
            } else {
                console.log('[BULK UPDATE] Deleted:', original.KK, original.JJ, original.MM, original.TT);
            }
        }
        
        console.log('[BULK UPDATE] Starting add phase...');
        // Add all modified observations
        for (const {modified} of modifiedObservations) {
            const addResp = await fetch('/api/observations', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(modified)
            });
            
            if (!addResp.ok) {
                console.error('[BULK UPDATE] Failed to add modified observation:', modified);
            } else {
                console.log('[BULK UPDATE] Added:', modified.KK, modified.JJ, modified.MM, modified.TT);
            }
        }
        
        console.log('[BULK UPDATE] Reloading observations...');
        // Reload observations from server to get correct sorted order
        const obsResponse = await fetch('/api/observations?limit=200000');
        if (obsResponse.ok) {
            const data = await obsResponse.json();
            window.haloData.observations = data.observations;
            window.haloData.isDirty = true;
            console.log('[BULK UPDATE] Reloaded', data.observations.length, 'observations, isDirty:', window.haloData.isDirty);
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
        } else {
            console.error('[BULK UPDATE] Failed to reload observations');
        }
        
        console.log('[BULK UPDATE] Showing success message');
        showMessage(`${filteredObs.length} Beobachtungen wurden erfolgreich geändert.`, 'success');
        
        // Reload the page to refresh all displays
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('[BULK UPDATE ERROR]', error);
        showErrorDialog('Fehler beim Aktualisieren der Beobachtungen: ' + error.message);
    }
}

// Show Delete Observations dialog (two-stage filters, then iterate)
async function showDeleteObservationsDialog() {
    // Ensure data is loaded
    if (!window.haloData || !window.haloData.isLoaded || !window.haloData.observations || window.haloData.observations.length === 0) {
        showWarningModal(i18nStrings.dialogs?.no_data?.message || 'Keine Daten geladen! Bitte laden Sie zuerst eine Datei.');
        return;
    }

    // Use the existing two-stage filter dialog
    const filterDialog = new FilterDialog();
    await filterDialog.initialize();

    filterDialog.show(
        (filterState) => {
            // Apply and begin delete iteration
            showDeleteSingleObservations(filterState);
        },
        () => {
            // Cancel returns to main
            window.location.href = '/';
        }
    );
}

// Iterate observations and ask delete (Yes/No/Cancel). Default = No.
async function showDeleteSingleObservations(filterState) {
    const filteredObs = applyFilterToObservations(filterState);

    if (filteredObs.length === 0) {
        showWarningModal(i18nStrings.ui?.messages?.no_observations || 'Keine Beobachtungen gefunden!');
        return;
    }

    let currentIndex = 0;

    const next = () => {
        if (currentIndex >= filteredObs.length) {
            window.location.href = '/';
            return;
        }

        const obs = filteredObs[currentIndex];
        const obsIndex = window.haloData.observations.indexOf(obs);

        showObservationFormForDelete(obs, currentIndex + 1, filteredObs.length, async () => {
            // Yes -> delete
            try {
                // Remove from client array first if present
                if (obsIndex >= 0) {
                    window.haloData.observations.splice(obsIndex, 1);
                }

                // Log payload that will be sent to the API for easier debugging
                console.log('[DELETE DEBUG] Sending delete payload:', obs);

                // Delete on server
                const resp = await fetch('/api/observations/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(obs)
                });

                if (!resp.ok) {
                    throw new Error('Delete endpoint responded ' + resp.status);
                }

                // Optionally reload from server to ensure order/count
                const reload = await fetch('/api/observations?limit=200000');
                if (reload.ok) {
                    const data = await reload.json();
                    window.haloData.observations = data.observations;
                }

                window.haloData.isDirty = true;
                updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
                
                // Save to sessionStorage to persist dirty flag
                if (window.saveHaloDataToSession) {
                    window.saveHaloDataToSession();
                }
                
                await triggerAutosave();

                const msg = window.currentLanguage === 'de' ? 'Beobachtung gelöscht' : 'Observation deleted';
                showMessage(msg, 'success');
                
                // Delay redirect to allow message to show
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } catch (e) {
                console.error('Error deleting observation:', e);
                showErrorDialog((i18nStrings.common?.error || 'Fehler') + ': ' + e.message);
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            }
        }, () => {
            // No -> show next
            currentIndex += 1;
            next();
        }, () => {
            // Cancel -> return to main
            window.location.href = '/';
        });
    };

    next();
}

// Confirmation dialog for deletion with default focus on No
async function showDeleteConfirmDialog(obs, currentNum, totalNum, callback) {
    console.log('[DELETE DIALOG DEBUG] i18nStrings:', i18nStrings);
    console.log('[DELETE DIALOG DEBUG] delete_question:', i18nStrings.menus?.observations?.delete_question);
    const questionText = i18nStrings.menus?.observations?.delete_question;
    const yesText = i18nStrings.observers?.yes;
    const noText = i18nStrings.observers?.no;
    const cancelText = i18nStrings.common?.cancel;
    console.log('[DELETE DIALOG DEBUG] Texts:', {questionText, yesText, noText, cancelText});

    const obsDisplay = formatObservationForDisplay(obs);

    const html = `
        <div class="modal fade" id="delete-confirm-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h6 class="modal-title">${questionText} (${currentNum}/${totalNum})</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2">
                        <div style="font-size: 14px; line-height: 1.6; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${obsDisplay}</div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-delete-cancel">${cancelText}</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btn-delete-no">${noText}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-delete-yes">${yesText}</button>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const modalEl = document.getElementById('delete-confirm-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Default focus on No, Enter triggers No
    const btnNo = document.getElementById('btn-delete-no');
    const btnYes = document.getElementById('btn-delete-yes');
    const btnCancel = document.getElementById('btn-delete-cancel');
    if (btnNo) btnNo.focus();

    let answered = false;
    const keyHandler = (e) => {
        if (e.key === 'Enter' && !answered) {
            answered = true;
            modal.hide();
            callback(false);
        } else if (e.key === 'Escape' && !answered) {
            answered = true;
            modal.hide();
            callback(null);
        }
    };
    document.addEventListener('keydown', keyHandler);

    btnYes.addEventListener('click', () => { answered = true; modal.hide(); callback(true); });
    btnNo.addEventListener('click', () => { answered = true; modal.hide(); callback(false); });
    btnCancel.addEventListener('click', () => { answered = true; modal.hide(); callback(null); });

    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
        document.removeEventListener('keydown', keyHandler);
        if (!answered) {
            callback(null);
        }
    });
}

// Apply filter criteria to observations
function applyFilterToObservations(filterState) {
    const allObs = window.haloData.observations || [];
    
    return allObs.filter(obs => {
        // First filter criterion
        if (filterState.criterion1 === 'observer') {
            if (filterState.value1 !== null && obs.KK !== filterState.value1) return false;
        } else if (filterState.criterion1 === 'region') {
            if (filterState.value1 !== null && obs.g !== filterState.value1) return false;
        }
        
        // Second filter criterion
        if (filterState.criterion2 === 'date') {
            if (filterState.value2 && (obs.TT !== filterState.value2.t || obs.MM !== filterState.value2.m || obs.JJ !== filterState.value2.j)) {
                return false;
            }
        } else if (filterState.criterion2 === 'month') {
            if (filterState.value2 && (obs.MM !== filterState.value2.m || obs.JJ !== filterState.value2.j)) {
                return false;
            }
        } else if (filterState.criterion2 === 'year') {
            if (filterState.value2 !== null && obs.JJ !== filterState.value2) return false;
        } else if (filterState.criterion2 === 'halo-type') {
            if (filterState.value2 !== null && obs.EE !== filterState.value2) return false;
        }
        
        return true;
    });
}

// Show confirmation dialog asking if user wants to modify this observation
async function showModifyConfirmDialog(obs, currentNum, totalNum, callback) {
    const questionText = i18nStrings.menus?.observations?.modify_question;
    const yesText = i18nStrings.observers?.yes;
    const noText = i18nStrings.observers?.no;
    const cancelText = i18nStrings.common?.cancel;
    
    // Format observation display
    const obsDisplay = formatObservationForDisplay(obs);
    
    const modalHtml = `
        <div class="modal fade" id="modify-confirm-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h6 class="modal-title">${questionText} (${currentNum}/${totalNum})</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2">
                        <div style="font-size: 14px; line-height: 1.6; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${obsDisplay}</div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-modify-cancel">${cancelText}</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btn-modify-no">${noText}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-modify-yes">${yesText}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('modify-confirm-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    let answered = false;
    
    document.getElementById('btn-modify-yes').addEventListener('click', () => {
        answered = true;
        modal.hide();
        callback(true);
    });
    
    document.getElementById('btn-modify-no').addEventListener('click', () => {
        answered = true;
        modal.hide();
        callback(false);
    });
    
    document.getElementById('btn-modify-cancel').addEventListener('click', () => {
        answered = true;
        modal.hide();
        callback(null); // null indicates cancel entire operation
    });
    
    // Handle ESC key to return to main menu
    const escHandler = (e) => {
        if (e.key === 'Escape' && !answered) {
            answered = true;
            modal.hide();
            callback(null);
            window.location.href = '/';
        }
    };
    document.addEventListener('keydown', escHandler);
    
    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
        document.removeEventListener('keydown', escHandler);
        if (!answered) {
            callback(null);
            window.location.href = '/';
        }
    });
}

// Format observation for display in confirmation dialog (Menüeingabe format)
function formatObservationForDisplay(obs) {
    // Use the Menüeingabe (menu input) format with labeled fields
    const i18n = window.i18nStrings;
    let html = '';
    
    // Observer
    html += `<strong>${i18n?.fields?.observer || 'Beobachter'}:</strong> ${obs.KK}<br>`;
    
    // Object type
    const objectType = i18n?.object_types?.[obs.O] || `Objekt ${obs.O}`;
    html += `<strong>${i18n?.fields?.object || 'Objekt'}:</strong> ${obs.O} - ${objectType}<br>`;
    
    // Date
    const monthName = i18n?.months?.[obs.MM] || obs.MM;
    html += `<strong>${i18n?.fields?.year || 'Jahr'}:</strong> ${obs.JJ} `;
    html += `<strong>${i18n?.fields?.month || 'Monat'}:</strong> ${monthName} `;
    html += `<strong>${i18n?.fields?.day || 'Tag'}:</strong> ${obs.TT}<br>`;
    
    // Location type (observing site)
    const locType = i18n?.location_types?.[obs.g] || `Ort ${obs.g}`;
    html += `<strong>${i18n?.fields?.observing_area || 'Beobachtungsort'}:</strong> ${locType}<br>`;
    
    // Time
    const timeStr = (obs.ZS !== null && obs.ZS !== -1 && obs.ZS !== 99) ? String(obs.ZS).padStart(2, '0') : '--';
    const timeMin = (obs.ZM !== null && obs.ZM !== -1 && obs.ZM !== 99) ? String(obs.ZM).padStart(2, '0') : '--';
    html += `<strong>Zeit:</strong> ${timeStr}:${timeMin}<br>`;
    
    // Duration (DD × 10 = minutes)
    if (obs.DD !== null && obs.DD !== -1) {
        html += `<strong>${i18n?.fields?.duration || 'Dauer'}:</strong> ${obs.DD * 10} min<br>`;
    }
    
    // Origin/Density
    if (obs.d !== null && obs.d !== -1) {
        const origin = i18n?.origin_density?.[obs.d] || `${obs.d}`;
        html += `<strong>${i18n?.fields?.origin || 'Entstehungsort'}:</strong> ${origin}<br>`;
    }
    
    // Cirrus density
    if (obs.N !== null && obs.N !== -1) {
        const cirrusDens = i18n?.cirrus_density?.[obs.N] || `${obs.N}`;
        html += `<strong>${i18n?.fields?.cirrus_density || 'Dichte'}:</strong> ${cirrusDens}<br>`;
    }
    
    // Cloud cover
    if (obs.C !== null && obs.C !== -1) {
        const cloudCover = i18n?.cloud_cover?.[obs.C] || `${obs.C}/8`;
        html += `<strong>${i18n?.fields?.cloud_cover || 'Bedeckung'}:</strong> ${cloudCover}<br>`;
    }
    
    // Cirrus type
    if (obs.C !== null && obs.C !== -1) {
        const cirrusType = i18n?.cirrus_types?.[obs.C] || `${obs.C}`;
        html += `<strong>${i18n?.fields?.cirrus_type || 'Cirrustyp'}:</strong> ${cirrusType}<br>`;
    }
    
    // Halo phenomenon
    const haloType = i18n?.halo_types?.[obs.EE] || `Halo ${obs.EE}`;
    html += `<strong>${i18n?.fields?.phenomenon || 'Haloart'}:</strong> ${String(obs.EE).padStart(2, '0')} - ${haloType}<br>`;
    
    // Brightness
    if (obs.H !== null && obs.H !== -1) {
        const brightness = i18n?.brightness?.[obs.H] || `${obs.H}`;
        html += `<strong>${i18n?.fields?.brightness || 'Helligkeit'}:</strong> ${brightness}<br>`;
    }
    
    // Color
    if (obs.F !== null && obs.F !== -1) {
        const color = i18n?.color?.[obs.F] || `${obs.F}`;
        html += `<strong>${i18n?.fields?.color || 'Farbe'}:</strong> ${color}<br>`;
    }
    
    // Completeness
    if (obs.V !== null && obs.V !== -1) {
        const complete = i18n?.completeness?.[obs.V] || `${obs.V}`;
        html += `<strong>${i18n?.fields?.completeness || 'Vollständigkeit'}:</strong> ${complete}<br>`;
    }
    
    // Weather front
    if (obs.f !== null && obs.f !== -1) {
        const front = i18n?.weather_front?.[obs.f] || `${obs.f}`;
        html += `<strong>Front:</strong> ${front}<br>`;
    }
    
    // Precipitation
    if (obs.zz !== null && obs.zz !== -1 && obs.zz !== 99) {
        html += `<strong>${i18n?.fields?.precipitation || 'Niederschlag'}:</strong> ${obs.zz} mm<br>`;
    }
    
    // Geographic region
    const region = i18n?.geographic_regions?.[obs.GG] || `Region ${obs.GG}`;
    html += `<strong>${i18n?.fields?.region || 'Gebiet'}:</strong> ${String(obs.GG).padStart(2, '0')} - ${region}<br>`;
    
    // Sectors
    if (obs.sectors && obs.sectors.trim()) {
        html += `<strong>${i18n?.fields?.sectors || 'Sektoren'}:</strong> ${obs.sectors.trim()}<br>`;
    }
    
    // Remarks
    if (obs.remarks && obs.remarks.trim()) {
        html += `<strong>${i18n?.fields?.remarks || 'Bemerkungen'}:</strong> ${obs.remarks.trim()}<br>`;
    }
    
    return html;
}

// Show observation form for editing
async function showObservationFormForEdit(obs, currentNum, totalNum, onModified, onCancelled, obsIndex = null) {
    const form = new ObservationForm();
    await form.initialize();
    
    // Store the original observation index for deletion
    let originalIndex = obsIndex;
    if (originalIndex === null) {
        // Find index if not provided
        originalIndex = window.haloData.observations.indexOf(obs);
    }
    
    form.show('edit', obs, async (modifiedObs) => {
        // Delete the old observation and insert the modified one
        try {
            const logs = [];
            
            logs.push('[EDIT DEBUG] Original observation: ' + JSON.stringify(obs));
            logs.push('[EDIT DEBUG] Modified observation: ' + JSON.stringify(modifiedObs));
            
            // Remove old observation from array using the stored index
            if (originalIndex >= 0 && originalIndex < window.haloData.observations.length) {
                logs.push(`[EDIT DEBUG] Deleting observation at index ${originalIndex}`);
                const deleted = window.haloData.observations.splice(originalIndex, 1);
                logs.push('[EDIT DEBUG] Deleted from client array: ' + JSON.stringify(deleted));
                console.log(...logs);
            } else {
                logs.push('[EDIT DEBUG] Could not find observation to delete at index ' + originalIndex);
                console.warn(...logs);
            }
            
            // Add modified observation to server (which will insert at correct position)
            logs.push('[EDIT DEBUG] POSTing modified observation to server');
            
            // First, delete the old observation from server by passing original values
            const deleteResp = await fetch('/api/observations/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(obs)  // Send original observation to identify what to delete
            });
            
            logs.push('[EDIT DEBUG] DELETE response status: ' + deleteResp.status);
            if (deleteResp.ok) {
                logs.push('[EDIT DEBUG] Successfully deleted old observation from server');
            }
            
            // Now POST the modified observation
            const resp = await fetch('/api/observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modifiedObs)
            });
            
            logs.push('[EDIT DEBUG] POST response status: ' + resp.status + ', ok: ' + resp.ok);
            if (!resp.ok) throw new Error('Failed to save modified observation');
            
            const addedObs = await resp.json();
            logs.push('[EDIT DEBUG] Added observation response: ' + JSON.stringify(addedObs));
            
            // Reload observations from server to get correct sorted order
            logs.push('[EDIT DEBUG] Reloading observations from server');
            const obsResponse = await fetch('/api/observations?limit=200000');
            if (obsResponse.ok) {
                const data = await obsResponse.json();
                logs.push('[EDIT DEBUG] Reloaded from server: ' + data.observations?.length + ' observations');
                window.haloData.observations = data.observations;
            }
            
            // Save logs to sessionStorage for later viewing
            sessionStorage.setItem('lastEditLogs', logs.join('\n'));
            console.log('Debug logs saved to sessionStorage:', logs.join('\n'));
            
            // Set dirty flag
            window.haloData.isDirty = true;
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
            
            // Trigger autosave
            await triggerAutosave();
            
            const successMsg = window.currentLanguage === 'de' 
                ? 'Beobachtung geändert'
                : 'Observation modified';
            showMessage(successMsg, 'success');
            
            // Delay before calling onModified (which redirects)
            setTimeout(() => {
                if (onModified) onModified();
            }, 1500);
        } catch (e) {
            console.error('Error modifying observation:', e);
            showErrorDialog(i18nStrings.common?.error + ': ' + e.message);
        }
    }, () => {
        if (onCancelled) onCancelled();
    }, currentNum, totalNum);
}

// Show observation form for deletion (read-only display with Yes/No/Cancel)
async function showObservationFormForDelete(obs, currentNum, totalNum, onYes, onNo, onCancel) {
    const form = new ObservationForm();
    await form.initialize();
    
    // Show the form in delete mode with custom title and buttons
    const questionText = i18nStrings.menus?.observations?.delete_question;
    form.show('delete', obs, null, null, currentNum, totalNum, questionText, onYes, onNo, onCancel);
}

// Show Display Observations dialog (filter then navigate)
async function showDisplayObservationsDialog() {
    // Check if data is loaded
    if (!window.haloData || !window.haloData.isLoaded || !window.haloData.observations || window.haloData.observations.length === 0) {
        showWarningModal(i18nStrings.dialogs?.no_data?.message || 'Keine Daten geladen! Bitte laden Sie zuerst eine Datei.');
        return;
    }
    
    // Initialize filter dialog
    const filterDialog = new FilterDialog();
    await filterDialog.initialize();
    
    // Show filter dialog with callbacks
    filterDialog.show(
        (filterState) => {
            // onApply callback - filters have been applied
            showDisplaySingleObservations(filterState);
        },
        () => {
            // onCancel callback - user cancelled
            console.log('Display dialog cancelled');
        }
    );
}

// Show single observations for display (one by one with navigation)
async function showDisplaySingleObservations(filterState) {
    // Apply filters to get filtered observations
    const filteredObs = applyFilterToObservations(filterState);
    
    if (filteredObs.length === 0) {
        showWarningModal(i18nStrings.ui?.messages?.no_observations || 'Keine Beobachtungen gefunden!');
        return;
    }
    
    let currentIndex = 0;
    
    const showNext = () => {
        if (currentIndex >= filteredObs.length) {
            window.location.href = '/';
            return;
        }
        
        const obs = filteredObs[currentIndex];
        showObservationFormForView(obs, currentIndex + 1, filteredObs.length, () => {
            // Next button
            currentIndex++;
            showNext();
        }, () => {
            // Previous button
            if (currentIndex > 0) {
                currentIndex--;
                showNext();
            }
        }, () => {
            // Cancel/Close - return to main
            window.location.href = '/';
        });
    };
    
    showNext();
}

// Show observation form for viewing (read-only display with navigation)
async function showObservationFormForView(obs, currentNum, totalNum, onNext, onPrev, onClose) {
    const form = new ObservationForm();
    await form.initialize();
    
    // Show the form in view mode
    form.show('view', obs, null, null, currentNum, totalNum, null, onNext, onPrev, onClose);
}

// Show Active Observers setting dialog (Ja/Nein)
async function showActiveObserversDialog() {
    try {
        const response = await fetch('/api/config/active_observers');
        const config = await response.json();
        const enabled = !!config.enabled;

        const title = i18nStrings.menus.settings.active_observers_question || i18nStrings.menus.settings.active_observers;
        const yesText = i18nStrings.observers?.yes || 'Yes';
        const noText = i18nStrings.observers?.no || 'No';

        const modalHtml = `
            <div class="modal fade" id="active-observers-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="form-check form-check-inline mb-0">
                                <input class="form-check-input" type="radio" name="active_observers" id="active-yes" value="1" ${enabled ? 'checked' : ''}>
                                <label class="form-check-label" for="active-yes">${yesText}</label>
                            </div>
                            <div class="form-check form-check-inline mb-0">
                                <input class="form-check-input" type="radio" name="active_observers" id="active-no" value="0" ${!enabled ? 'checked' : ''}>
                                <label class="form-check-label" for="active-no">${noText}</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>
                            <button type="button" class="btn btn-primary" id="btn-active-ok">${i18nStrings.common.ok}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('active-observers-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        document.getElementById('btn-active-ok').addEventListener('click', async () => {
            const selected = document.querySelector('input[name="active_observers"]:checked');
            const newEnabled = selected ? selected.value === '1' : enabled;
            modal.hide();

            await fetch('/api/config/active_observers', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({enabled: newEnabled})
            });
        });

        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    } catch (error) {
        console.error('Active observers dialog error:', error);
    }
}
// Create new file
async function showNewFileDialog() {
    const modalHtml = `
        <div class="modal fade" id="new-file-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${i18nStrings.dialogs.new_file.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${i18nStrings.dialogs.new_file.prompt}</p>
                        <input type="text" id="new-filename" class="form-control">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>
                        <button type="button" class="btn btn-primary" id="ok-new">${i18nStrings.common.ok}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('new-file-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const input = document.getElementById('new-filename');
    modalEl.addEventListener('shown.bs.modal', () => input.focus());
    
    // Handle OK button
    document.getElementById('ok-new').onclick = async () => {
        const filename = input.value.trim();
        if (!filename) {
            showErrorDialog(i18nStrings.common.please_enter_filename);
            return;
        }
        
        try {
            const response = await fetch('/api/file/new', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({filename: filename})
            });
            
            const result = await response.json();
            if (response.ok && result.success) {
                modal.hide();
                showMessage(result.message, 'success');
            } else {
                showErrorDialog(i18nStrings.common.error + ': ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            showErrorDialog(i18nStrings.common.error + ': ' + error.message);
        }
    };
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('ok-new').click();
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('ok-new').click();
        }
    });
    
    // Handle Escape key
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(dialog);
        }
    });
}

// Save file
async function saveFile() {
    try {
        const statusResponse = await fetch('/api/file/status');
        const status = await statusResponse.json();
        
        if (!status.filename) {
            showErrorDialog(i18nStrings.common.no_file_loaded);
            return;
        }
        
        const response = await fetch('/api/file/save', {method: 'POST'});
        const result = await response.json();
        
        if (response.ok && result.success) {
            window.haloData.isDirty = false;
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
            
            // Clean up autosave file
            await fetch('/api/file/cleanup_autosave', {method: 'POST'});
            
            showMessage(result.message, 'success');
        } else {
            showErrorDialog(i18nStrings.common.error + ': ' + result.error);
        }
    } catch (error) {
        showErrorDialog(i18nStrings.common.error + ': ' + error.message);
    }
}

// Save as
async function showSaveAsDialog() {
    try {
        const statusResponse = await fetch('/api/file/status');
        const status = await statusResponse.json();
        
        if (!status.filename) {
            showErrorDialog(i18nStrings.common.no_file_loaded);
            return;
        }
    } catch (error) {
        showErrorDialog(i18nStrings.common.error + ': ' + error.message);
        return;
    }
    
    // Show Bootstrap modal instead of browser prompt
    const modalHtml = `
        <div class="modal fade" id="saveas-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${i18nStrings.menus?.file?.save_as || i18nStrings.common?.save_as || 'Save as'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label">${i18nStrings.common?.save_as_prompt || 'Save as (without extension):'}</label>
                        <input type="text" class="form-control" id="saveas-filename" placeholder="${(window.haloData.fileName || 'ALLE.CSV').replace(/\.[^.]+$/, '')}" value="${(window.haloData.fileName || '').replace(/\.[^.]+$/, '')}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common?.cancel || 'Cancel'}</button>
                        <button type="button" class="btn btn-primary" id="saveas-ok">${i18nStrings.common?.ok || 'OK'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('saveas-modal');
    const modal = new bootstrap.Modal(modalEl);
    const filenameInput = document.getElementById('saveas-filename');
    
    modal.show();
    
    // Focus and select filename input
    setTimeout(() => {
        filenameInput.focus();
        filenameInput.select();
    }, 300);
    
    // Handle OK button
    document.getElementById('saveas-ok').addEventListener('click', async () => {
        const filename = filenameInput.value.trim();
        if (!filename) return;
        
        modal.hide();
        await processSaveAs(filename);
    });
    
    // Handle Enter key in input
    filenameInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const filename = filenameInput.value.trim();
            if (!filename) return;
            
            modal.hide();
            await processSaveAs(filename);
        }
    });
    
    // Clean up modal after hiding
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

async function processSaveAs(filename) {
    try {
        let response = await fetch('/api/file/saveas', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({filename: filename, overwrite: false})
        });
        
        let result = await response.json();
        
        if (result.exists) {
            const overwriteMsg = result.message + ' ' + (i18nStrings.common?.overwrite_confirm || 'Überschreiben?');
            showConfirmDialog(
                i18nStrings.common?.confirm || 'Bestätigung',
                overwriteMsg,
                async () => {
                    // User confirmed - proceed with overwrite
                    try {
                        response = await fetch('/api/file/saveas', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({filename: filename, overwrite: true})
                        });
                        
                        result = await response.json();
                        
                        if (response.ok && result.success) {
                            window.haloData.isDirty = false;
                            if (result.filename) {
                                window.haloData.fileName = result.filename;
                            }
                            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
                            
                            // Clean up autosave file
                            await fetch('/api/file/cleanup_autosave', {method: 'POST'});
                            
                            showMessage(result.message, 'success');
                        } else if (result.error) {
                            showErrorDialog(i18nStrings.common.error + ': ' + result.error);
                        }
                    } catch (error) {
                        showErrorDialog(i18nStrings.common.error + ': ' + error.message);
                    }
                }
            );
            return;
        }
        
        if (response.ok && result.success) {
            window.haloData.isDirty = false;
            if (result.filename) {
                window.haloData.fileName = result.filename;
            }
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
            
            // Clean up autosave file
            await fetch('/api/file/cleanup_autosave', {method: 'POST'});
            
            showMessage(result.message, 'success');
        } else if (result.error) {
            showErrorDialog(i18nStrings.common.error + ': ' + result.error);
        }
    } catch (error) {
        showErrorDialog(i18nStrings.common.error + ': ' + error.message);
    }
}

// Helper function - shows a toast message in top-right corner
function showMessage(text, type = 'info') {
    const msg = document.createElement('div');
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff';
    msg.style.cssText = `position:fixed;top:20px;right:20px;background:${bgColor};color:white;padding:15px 20px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.2);z-index:10000;font-size:14px;max-width:400px;`;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Auto-save helper function
async function triggerAutosave() {
    try {
        const response = await fetch('/api/file/autosave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            console.log('[AUTOSAVE] Saved successfully');
        } else {
            console.warn('[AUTOSAVE] Failed:', await response.text());
        }
    } catch (error) {
        console.error('[AUTOSAVE] Error:', error);
    }
}

// Check for autosave recovery on startup
async function checkAutosaveRecovery() {
    try {
        // Skip autosave recovery if we already have observations loaded in memory
        if (window.haloData.isLoaded && window.haloData.observations.length > 0) {
            console.log('[AUTOSAVE RECOVERY] Skipping - observations already in memory');
            return;
        }
        
        const response = await fetch('/api/file/check_autosave');
        if (!response.ok) return;
        
        const data = await response.json();
        if (!data.found) return;
        
        // Show recovery prompt
        const modalHtml = `
            <div class="modal fade" id="autosave-recovery-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18nStrings.dialogs.autosave_recovery.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${i18nStrings.dialogs.autosave_recovery.message}</p>
                            <p><strong>${data.original_file}</strong></p>
                            <p>${i18nStrings.dialogs.autosave_recovery.prompt}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary btn-sm px-3" id="btn-dismiss-autosave">
                                ${i18nStrings.dialogs.autosave_recovery.no}
                            </button>
                            <button type="button" class="btn btn-primary btn-sm px-3" id="btn-restore-autosave">
                                ${i18nStrings.dialogs.autosave_recovery.yes}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('autosave-recovery-modal');
        const modal = new bootstrap.Modal(modalEl);
        
        // Handle "No" - delete the autosave file
        document.getElementById('btn-dismiss-autosave').addEventListener('click', async () => {
            try {
                await fetch('/api/file/cleanup_autosave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('[AUTOSAVE] Failed to cleanup autosave file:', error);
            }
            modal.hide();
        });
        
        document.getElementById('btn-restore-autosave').addEventListener('click', async () => {
            try {
                const restoreResp = await fetch('/api/file/restore_autosave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ temp_file: data.temp_file })
                });
                
                if (!restoreResp.ok) throw new Error('Restore failed');
                
                const result = await restoreResp.json();
                
                // Update local state
                window.haloData.observations = result.observations || [];
                window.haloData.fileName = result.filename;
                window.haloData.isLoaded = true;
                window.haloData.isDirty = true;  // Mark as dirty since restored from temp
                saveHaloDataToSession();  // Sync to sessionStorage
                
                updateFileInfoDisplay(result.filename, result.count);
                
                modal.hide();
                showMessage(result.message, 'success');
            } catch (error) {
                showErrorDialog(i18nStrings.dialogs.autosave_recovery.error + ': ' + error.message);
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        modal.show();
    } catch (error) {
        console.error('[AUTOSAVE RECOVERY] Error:', error);
    }
}

// Show error dialog
function showErrorDialog(message, onClose = null) {
    const modalHtml = `
        <div class="modal fade" id="error-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${i18nStrings.dialogs?.error?.title || i18nStrings.common?.error || 'Fehler'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">${i18nStrings.common?.ok || 'OK'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('error-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
        if (onClose) {
            onClose();
        }
    });
}

// Load file dialog
async function showLoadFileDialog() {
    const isDirty = window.haloData?.isDirty;
    const exists = !!window.haloData;
    let warningShown = false;
    
    // Check if current file has unsaved changes
    if (window.haloData && window.haloData.isDirty) {
        warningShown = true;
        const message = i18nStrings.dialogs?.unsaved_changes?.message || 'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich fortfahren?';
        showConfirmDialog(
            i18nStrings.dialogs?.unsaved_changes?.title || 'Ungespeicherte Änderungen',
            message,
            () => continueLoadFile()
        );
        return;
    }
    
    continueLoadFile();
}

async function continueLoadFile() {
    
    // Use native file picker with webkitdirectory attribute workaround
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.CSV';
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Create loading modal
        const loadingModal = document.createElement('div');
        loadingModal.className = 'modal fade';
        loadingModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center py-4">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">${i18nStrings.dialogs.loading.loading}</span>
                        </div>
                        <p class="mb-0">${i18nStrings.dialogs.loading.loading_file} "${file.name}" ...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingModal);
        const bsModal = new bootstrap.Modal(loadingModal, { backdrop: 'static', keyboard: false });
        bsModal.show();
        
        try {
            // Clear previous data before loading new file
            window.haloData.observations = [];
            window.haloData.fileName = null;
            window.haloData.isLoaded = false;
            window.haloData.isDirty = false;
            
            // Upload file to server
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadResponse = await fetch('/api/file/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) throw new Error('Failed to upload file');
            
            // Load observations into global store
            const obsResponse = await fetch('/api/observations?limit=200000');
            if (!obsResponse.ok) throw new Error('Failed to load observations');
            
            const data = await obsResponse.json();
            window.haloData.observations = data.observations;
            window.haloData.fileName = file.name;
            window.haloData.isLoaded = true;
            saveHaloDataToSession();  // Sync to sessionStorage
            
            // Update file info in header
            updateFileInfoDisplay(window.haloData.fileName, window.haloData.observations.length);
            
            // Hide loading modal
            bsModal.hide();
            setTimeout(() => loadingModal.remove(), 300);
            
            // Show success message
            const obsText = i18nStrings.ui?.messages?.observations || i18nStrings.menu_titles.observations;
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${window.haloData.observations.length} ${obsText} ${i18nStrings.dialogs.success.loaded_from} "${file.name}" ${i18nStrings.dialogs.success.geladen}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
        } catch (error) {
            bsModal.hide();
            setTimeout(() => loadingModal.remove(), 300);
            console.error('Error loading file:', error);
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            errorMsg.style.cssText = 'z-index:9999;min-width:300px;';
            errorMsg.innerHTML = `
                <strong>✗</strong> ${i18nStrings.dialogs.file_error.error_loading_file}: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 5000);
        }
    });
    
    // Trigger native file picker
    fileInput.click();
}

// Update file info display
function updateFileInfoDisplay(fileName, count) {
    const fileInfo = document.getElementById('file-info');
    const fileNameElem = document.getElementById('file-name');
    const obsCountElem = document.getElementById('obs-count');
    
    if (fileInfo && fileNameElem && obsCountElem && i18nStrings.ui) {
        const dirtyMarker = window.haloData.isDirty ? '*' : '';
        fileNameElem.textContent = dirtyMarker + fileName;
        const countText = i18nStrings.ui.file_info.observations_count;
        obsCountElem.textContent = `${count} ${countText}`;
        fileInfo.style.display = 'flex';
    }
}
window.updateFileInfoDisplay = updateFileInfoDisplay;

// Clear file info display
function clearFileInfoDisplay() {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    // Clear global data
    window.haloData = {
        observations: [],
        fileName: null,
        isLoaded: false,
        isDirty: false
    };
}
window.clearFileInfoDisplay = clearFileInfoDisplay;

// Check if data is loaded on server and update display
async function checkAndDisplayFileInfo() {
    try {
        // Check if observations are loaded on server
        const response = await fetch('/api/observations?limit=1');
        if (response.ok) {
            const data = await response.json();
            if (data.total > 0 && data.file) {
                // Data is loaded, update display and global state
                // Only update if sessionStorage didn't already restore the observations
                if (window.haloData.observations.length === 0) {
                    window.haloData.isLoaded = true;
                    window.haloData.fileName = data.file;
                    window.haloData.observations = [];
                    saveHaloDataToSession();  // Sync to sessionStorage
                }
                updateFileInfoDisplay(data.file, data.total);
            } else {
                // No data loaded
                clearFileInfoDisplay();
            }
        } else {
            // No data loaded
            clearFileInfoDisplay();
        }
    } catch (error) {
        console.error('Error checking file info:', error);
        clearFileInfoDisplay();
    }
}

async function showSaveFileDialog() {
    await saveFile();
}

// Show warning modal with custom message
function showWarningModal(message) {
    const modalHtml = `
        <div class="modal fade" id="warning-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${i18nStrings.common?.warning || 'Warnung'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">${i18nStrings.common?.ok || 'OK'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('warning-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Show Fixed Observer dialog
async function showFixedObserverDialog() {
    try {
        // Get current fixed observer setting
        const configResponse = await fetch('/api/config/fixed_observer');
        const config = await configResponse.json();
        const currentObserver = config.observer || '';
        
        // Get list of observers
        const obsResponse = await fetch('/api/observers/list');
        const obsData = await obsResponse.json();
        const observers = obsData.observers || [];
        
        // Build dropdown options
        const noObserverText = i18nStrings.menus?.settings?.no_fixed_observer || '-- kein fester Beobachter --';
        let options = `<option value="">${noObserverText}</option>`;
        observers.forEach(obs => {
            const selected = String(obs.KK) === String(currentObserver) ? 'selected' : '';
            options += `<option value="${obs.KK}" ${selected}>${obs.KK} - ${obs.VName} ${obs.NName}</option>`;
        });
        
        // Create Bootstrap modal
        const modalHtml = `
            <div class="modal fade" id="fixed-observer-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18nStrings.menus?.settings?.fixed_observer_title || 'Fester Beobachter'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">${i18nStrings.menus?.settings?.fixed_observer_question || 'Wählen Sie einen bevorzugten Beobachter:'}</p>
                            <select class="form-select" id="fixed-observer-select">
                                ${options}
                            </select>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>
                            <button type="button" class="btn btn-primary" id="btn-fixed-observer-ok">${i18nStrings.common.ok}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('fixed-observer-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        document.getElementById('btn-fixed-observer-ok').addEventListener('click', async () => {
            const select = document.getElementById('fixed-observer-select');
            const newObserver = select.value;
            
            modal.hide();
            
            await fetch('/api/config/fixed_observer', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({observer: newObserver})
            });
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        
    } catch (error) {
        console.error('Fixed observer dialog error:', error);
    }
}

// Show Eingabeart dialog
async function showEingabeartDialog() {
    try {
        const response = await fetch('/api/config/inputmode');
        const config = await response.json();
        const currentMode = config.mode;
        
        // Create Bootstrap modal
        const modalHtml = `
            <div class="modal fade" id="eingabeart-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18nStrings.menus?.settings?.input_mode_title || 'Eingabeart'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">${i18nStrings.menus?.settings?.input_mode_question || ''}</p>
                            <div class="form-check form-check-inline mb-0">
                                <input class="form-check-input" type="radio" name="eingabeart" id="mode-m" value="M" ${currentMode === 'M' ? 'checked' : ''}>
                                <label class="form-check-label" for="mode-m">${i18nStrings.menus?.settings?.input_mode_menu || 'Menüeingaben'}</label>
                            </div>
                            <div class="form-check form-check-inline mb-0">
                                <input class="form-check-input" type="radio" name="eingabeart" id="mode-n" value="N" ${currentMode === 'N' ? 'checked' : ''}>
                                <label class="form-check-label" for="mode-n">${i18nStrings.menus?.settings?.input_mode_number || 'Zahleneingaben'}</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>
                            <button type="button" class="btn btn-primary" id="btn-eingabeart-ok">${i18nStrings.common.ok}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('eingabeart-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        document.getElementById('btn-eingabeart-ok').addEventListener('click', async () => {
            const selected = document.querySelector('input[name="eingabeart"]:checked');
            const newMode = selected ? selected.value : 'Z';
            
            modal.hide();
            
            if (newMode !== currentMode) {
                await fetch('/api/config/inputmode', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({mode: newMode})
                });
                // Silent success: no confirmation dialogs
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        
    } catch (error) {
        console.error('Eingabeart dialog error:', error);
    }
}
// Show version information dialog
function showVersionDialog() {
    const v = i18nStrings.menus?.help?.version_dialog || {};
    const versionText = `<h4 class="text-center mb-4">${v.title || 'HALO Version 2.5'}</h4>
           <p class="mb-2"><strong>${v.date_label || 'Date:'}:</strong> ${v.date || '26.10.2006'}</p>
           <p class="mb-3"><strong>${v.author_label || 'Author:'}:</strong> ${v.author || 'Sirko Molau'}</p>
           <hr class="my-3">
           <p class="mb-2">${v.description || 'Software package for halo observations'}</p>
           <p class="mb-2">${v.section || 'Sektion Halobeobachtung (SHB)'}</p>
           <p class="mb-3">${v.workgroup || 'Arbeitskreis Meteore (AKM)'}</p>
           <hr class="my-3">
           <p class="mb-1">Sirko Molau</p>
           <p class="mb-1">Abenstastr. 13b</p>
           <p class="mb-1">D-84072 Seysdorf</p>
           <p class="mb-3">Germany</p>
           <p class="mb-0"><small>E-Mail: sirko@molau.de</small></p>`;
    
    const modalHtml = `
        <div class="modal fade" id="version-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${i18nStrings.help?.version || 'Version'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <i class="bi bi-cloud-sun text-primary" style="font-size: 3rem;"></i>
                        </div>
                        ${versionText}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('version-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Show what's new dialog
async function showWhatsNewDialog() {
    try {
        const response = await fetch(`/api/whats-new/${currentLanguage}`);
        const data = await response.json();
        
        if (!response.ok) {
            showErrorDialog(i18nStrings.common.error_loading + ': ' + (data.error || i18nStrings.common.unknown_error));
            return;
        }
        
        // Convert markdown to HTML
        let htmlContent = data.content
            // ## headers (markdown h2)
            .replace(/^##(.+?)##$/gm, '<h4 class="mt-4 mb-3 text-primary">$1</h4>')
            // # headers (markdown h1 - used as subheadings)
            .replace(/^#(.+?)#$/gm, '<h5 class="mt-3 mb-2 fw-bold">$1</h5>')
            // Main headers (bold) - backup for ** syntax
            .replace(/\*\*(.*?)\*\*/g, '<h4 class="mt-4 mb-3 text-primary">$1</h4>')
            // Sub-headers (italic) - backup for * syntax
            .replace(/\*(.*?)\*/g, '<h5 class="mt-3 mb-2 fw-bold">$1</h5>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p class="mb-2">')
            // Line breaks
            .replace(/\n/g, '<br>');
        
        htmlContent = '<p class="mb-2">' + htmlContent + '</p>';
        
        const modalHtml = `
            <div class="modal fade" id="whatsnew-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18nStrings.help?.whats_new || "What's New"}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="font-size: 14px; line-height: 1.6;">
                            ${htmlContent}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('whatsnew-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        
    } catch (error) {
        showErrorDialog(i18nStrings.common.error + ': ' + error.message);
    }
}

// Show help dialog
async function showHelpDialog() {
    try {
        const response = await fetch(`/api/help/${currentLanguage}`);
        const data = await response.json();
        
        if (!response.ok) {
            showErrorDialog(i18nStrings.common.error_loading + ': ' + (data.error || i18nStrings.common.unknown_error));
            return;
        }
        
        // Convert markdown to HTML
        let htmlContent = data.content
            // # headers (markdown h1)
            .replace(/^# (.+)$/gm, '<h3 class="mt-4 mb-3 text-primary">$1</h3>')
            // ## headers (markdown h2)
            .replace(/^## (.+)$/gm, '<h4 class="mt-3 mb-2 text-primary">$1</h4>')
            // ### headers (markdown h3)
            .replace(/^### (.+)$/gm, '<h5 class="mt-3 mb-2 fw-bold">$1</h5>')
            // Bullet points (4-space indented = 2nd level)
            .replace(/^    \* (.+)$/gm, '<li style="margin-left: 40px;">$1</li>')
            // Bullet points (2-space indented = 1st level)
            .replace(/^  \* (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
            // Bullet points (no indent = top level)
            .replace(/^\* (.+)$/gm, '<li>$1</li>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p class="mb-2">')
            // Line breaks
            .replace(/\n/g, '<br>');
        
        htmlContent = '<p class="mb-2">' + htmlContent + '</p>';
        
        const modalHtml = `
            <div class="modal fade" id="help-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18nStrings.menu_titles?.help || 'Help'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="font-size: 14px; line-height: 1.6;">
                            ${htmlContent}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('help-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        
    } catch (error) {
        showErrorDialog(i18nStrings.common.error + ': ' + error.message);
    }
}

// Show add observer dialog
async function showAddObserverDialog(formData = null) {
    // Ensure i18n is loaded
    if (!i18nStrings.observers) {
        await loadI18n(currentLanguage);
    }
    
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    const months = i18nStrings.months || {};
    const regions = i18nStrings.geographic_regions || {};
    
    // Build month options with names
    const monthOptions = Array.from({length: 12}, (_, i) => {
        const month = i + 1;
        const monthName = months[month] || month.toString().padStart(2, '0');
        return `<option value="${month}">${monthName}</option>`;
    }).join('');
    
    // Build year options (1950 to 2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 1950 + i;
        const yearShort = year % 100;
        return `<option value="${yearShort}">${year}</option>`;
    }).join('');
    
    // Build region options with real names (1-39)
    const regionOptions = Array.from({length: 39}, (_, i) => {
        const region = i + 1;
        const regionName = regions[region];
        if (regionName) {
            return `<option value="${region}">${region} - ${regionName}</option>`;
        }
        return '';
    }).join('');
    
    // Build degree options (0-180 for longitude, 0-90 for latitude)
    const lonDegOptions = Array.from({length: 181}, (_, i) => 
        `<option value="${i}">${i}</option>`
    ).join('');
    
    const latDegOptions = Array.from({length: 91}, (_, i) => 
        `<option value="${i}">${i}</option>`
    ).join('');
    
    // Build minute options (0-59)
    const minOptions = Array.from({length: 60}, (_, i) => 
        `<option value="${i}">${i}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal fade" id="add-observer-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h6 class="modal-title mb-0">${i18n.add_title || 'Add Observer'}</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2">
                        <form id="observer-form">
                            <div class="row g-2">
                                <!-- KK, First Name, Last Name -->
                                <div class="col-md-2">
                                    <label class="form-label small mb-0">${i18n.kk_label || 'KK'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="obs-kk" maxlength="2" pattern="[0-9]{2}" required>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label small mb-0">${i18n.first_name_label || 'First Name'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="obs-vname" maxlength="15" required>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label small mb-0">${i18n.last_name_label || 'Last Name'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="obs-nname" maxlength="15" required>
                                </div>
                                
                                <!-- Since (Month/Year) and Active -->
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_month_label || 'Since (Month)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="obs-seit-month" required>
                                        ${monthOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_year_label || 'Since (Year)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="obs-seit-year" required>
                                        ${yearOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.active_label || 'Active'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="obs-active" required>
                                        <option value="1">${i18n.yes || 'Yes'}</option>
                                        <option value="0">${i18n.no || 'No'}</option>
                                    </select>
                                </div>
                                
                                <!-- Main Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.main_site_label || 'Main Observation Site'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.main_site_label || 'Main Site'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="obs-hb-ort" maxlength="20" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Region'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="obs-gh" required>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Main Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Longitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="obs-hlg" required>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="obs-hlm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="obs-how" style="max-width: 70px;" required>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Latitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="obs-hbg" required>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="obs-hbm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="obs-hns" style="max-width: 70px;" required>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Secondary Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.secondary_site_label || 'Secondary Observation Site'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.secondary_site_label || 'Secondary Site'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="obs-nb-ort" maxlength="20" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Region'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="obs-gn" required>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Secondary Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Longitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="obs-nlg" required>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="obs-nlm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="obs-now" style="max-width: 70px;" required>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Latitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="obs-nbg" required>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="obs-nbm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="obs-nns" style="max-width: 70px;" required>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div id="observer-error" class="text-danger mt-2" style="display:none; font-size: 12px;"></div>
                        </form>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Cancel'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-add-observer-ok">${common.ok || 'Save'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('add-observer-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const errEl = document.getElementById('observer-error');
    
    // Focus KK input when modal is shown and restore form data if provided
    modalEl.addEventListener('shown.bs.modal', () => {
        if (formData) {
            // Restore form values
            document.getElementById('obs-kk').value = formData.KK || '';
            document.getElementById('obs-vname').value = formData.VName || '';
            document.getElementById('obs-nname').value = formData.NName || '';
            document.getElementById('obs-seit-month').value = formData.seit_month || '';
            document.getElementById('obs-seit-year').value = formData.seit_year || '';
            document.getElementById('obs-active').value = formData.active !== undefined ? formData.active : '';
            document.getElementById('obs-hb-ort').value = formData.HbOrt || '';
            document.getElementById('obs-gh').value = formData.GH || '';
            document.getElementById('obs-hlg').value = formData.HLG !== undefined ? formData.HLG : '';
            document.getElementById('obs-hlm').value = formData.HLM !== undefined ? formData.HLM : '';
            document.getElementById('obs-how').value = formData.HOW || 'O';
            document.getElementById('obs-hbg').value = formData.HBG !== undefined ? formData.HBG : '';
            document.getElementById('obs-hbm').value = formData.HBM !== undefined ? formData.HBM : '';
            document.getElementById('obs-hns').value = formData.HNS || 'N';
            document.getElementById('obs-nb-ort').value = formData.NbOrt || '';
            document.getElementById('obs-gn').value = formData.GN || '';
            document.getElementById('obs-nlg').value = formData.NLG !== undefined ? formData.NLG : '';
            document.getElementById('obs-nlm').value = formData.NLM !== undefined ? formData.NLM : '';
            document.getElementById('obs-now').value = formData.NOW || 'O';
            document.getElementById('obs-nbg').value = formData.NBG !== undefined ? formData.NBG : '';
            document.getElementById('obs-nbm').value = formData.NBM !== undefined ? formData.NBM : '';
            document.getElementById('obs-nns').value = formData.NNS || 'N';
        }
        document.getElementById('obs-kk').focus();
    });
    
    // Handle Enter key to submit
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('btn-add-observer-ok').click();
        }
    });
    
    // Handle save button
    document.getElementById('btn-add-observer-ok').addEventListener('click', async () => {
        try {
            errEl.style.display = 'none';
            
            // Collect form data
            const observerData = {
                KK: document.getElementById('obs-kk').value.trim().padStart(2, '0'),
                VName: document.getElementById('obs-vname').value.trim(),
                NName: document.getElementById('obs-nname').value.trim(),
                seit_month: parseInt(document.getElementById('obs-seit-month').value),
                seit_year: parseInt(document.getElementById('obs-seit-year').value),
                active: parseInt(document.getElementById('obs-active').value),
                HbOrt: document.getElementById('obs-hb-ort').value.trim(),
                GH: document.getElementById('obs-gh').value.padStart(2, '0'),
                HLG: parseInt(document.getElementById('obs-hlg').value),
                HLM: parseInt(document.getElementById('obs-hlm').value),
                HOW: document.getElementById('obs-how').value,
                HBG: parseInt(document.getElementById('obs-hbg').value),
                HBM: parseInt(document.getElementById('obs-hbm').value),
                HNS: document.getElementById('obs-hns').value,
                NbOrt: document.getElementById('obs-nb-ort').value.trim(),
                GN: document.getElementById('obs-gn').value.padStart(2, '0'),
                NLG: parseInt(document.getElementById('obs-nlg').value),
                NLM: parseInt(document.getElementById('obs-nlm').value),
                NOW: document.getElementById('obs-now').value,
                NBG: parseInt(document.getElementById('obs-nbg').value),
                NBM: parseInt(document.getElementById('obs-nbm').value),
                NNS: document.getElementById('obs-nns').value
            };
            
            // Validate required fields
            if (!observerData.KK || !observerData.VName || !observerData.NName || 
                !observerData.HbOrt || !observerData.GH || !observerData.NbOrt || !observerData.GN) {
                // Store form data
                const formData = observerData;
                modal.hide();
                modalEl.addEventListener('hidden.bs.modal', () => {
                    modalEl.remove();
                    showErrorDialog(i18n.error_missing_required || 'Please fill in all required fields!', () => {
                        showAddObserverDialog(formData);
                    });
                }, { once: true });
                return;
            }
            
            // Validate KK format
            if (!/^\d{2}$/.test(observerData.KK) || parseInt(observerData.KK) < 1 || parseInt(observerData.KK) > 99) {
                const formData = observerData;
                modal.hide();
                modalEl.addEventListener('hidden.bs.modal', () => {
                    modalEl.remove();
                    showErrorDialog(i18n.error_invalid_kk || 'Invalid observer code (01-99)', () => {
                        showAddObserverDialog(formData);
                    });
                }, { once: true });
                return;
            }
            
            // Send to API
            const resp = await fetch('/api/observers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(observerData)
            });
            
            const result = await resp.json();
            
            if (!resp.ok) {
                // Check for specific error messages
                const formData = observerData;
                if (result.error && result.error.includes('already exists')) {
                    // Show modal error for duplicate KK
                    modal.hide();
                    modalEl.addEventListener('hidden.bs.modal', () => {
                        modalEl.remove();
                        showErrorDialog(i18n.error_kk_exists || result.error, () => {
                            showAddObserverDialog(formData);
                        });
                    }, { once: true });
                } else {
                    modal.hide();
                    modalEl.addEventListener('hidden.bs.modal', () => {
                        modalEl.remove();
                        showErrorDialog(result.error || 'Error saving observer', () => {
                            showAddObserverDialog(formData);
                        });
                    }, { once: true });
                }
                return;
            }
            
            // Success - close modal
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${i18n.success_added || 'Observer successfully added'}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);
            
        } catch (e) {
            const formData = observerData;
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => {
                modalEl.remove();
                showErrorDialog(e.message, () => {
                    showAddObserverDialog(formData);
                });
            }, { once: true });
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Delete Observer Dialog Functions
async function showDeleteObserverDialog() {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    
    // Load observers first
    try {
        const resp = await fetch('/api/observers');
        const data = await resp.json();
        
        if (!data.observers || data.observers.length === 0) {
            showErrorDialog(i18n.error_loading_observers || 'No observers found');
            return;
        }
        
        // Create observer options sorted by KK
        const observers = data.observers.sort((a, b) => a.KK.localeCompare(b.KK));
        const observerOptions = observers.map(obs => 
            `<option value="${obs.KK}">${obs.KK} ${obs.VName} ${obs.NName}</option>`
        ).join('');
        
        const modalHtml = `
            <div class="modal fade" id="select-delete-observer-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header py-2">
                            <h5 class="modal-title">${i18n.delete_observer || 'Beobachter löschen'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <label class="form-label">${i18n.select_observer_prompt || 'Beobachter auswählen:'}</label>
                            <select class="form-select" id="delete-observer-select" required>
                                ${observerOptions}
                            </select>
                        </div>
                        <div class="modal-footer py-1">
                            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Abbrechen'}</button>
                            <button type="button" class="btn btn-primary btn-sm" id="btn-select-delete-observer-ok">${common.ok || 'OK'}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('select-delete-observer-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        // Handle OK button
        document.getElementById('btn-select-delete-observer-ok').addEventListener('click', async () => {
            const selectedKK = document.getElementById('delete-observer-select').value;
            if (!selectedKK) {
                return;
            }
            
            const selectedObserver = observers.find(obs => obs.KK === selectedKK);
            
            // Load all sites for this observer first
            try {
                const sitesResp = await fetch(`/api/observers/${selectedKK}/sites`);
                const sitesData = await sitesResp.json();
                
                // Now close modal and show confirm dialog
                modal.hide();
                modalEl.addEventListener('hidden.bs.modal', () => {
                    modalEl.remove();
                    showDeleteObserverConfirmDialog(selectedObserver, sitesData.sites);
                }, { once: true });
            } catch (e) {
                modal.hide();
                modalEl.addEventListener('hidden.bs.modal', () => {
                    modalEl.remove();
                    showErrorDialog(e.message);
                }, { once: true });
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        
    } catch (e) {
        showErrorDialog(e.message);
    }
}

async function showDeleteObserverConfirmDialog(observer, sites) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    const months = i18nStrings.months || {};
    
    // Build table rows
    const tableRows = sites.map(site => {
        const yearNum = parseInt(site.seit_year);
        const fullYear = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
        const monthName = months[site.seit_month] || site.seit_month;
        const seitDisplay = `${String(site.seit_month).padStart(2, '0')}/${String(yearNum).padStart(2, '0')}`;
        const aktivDisplay = site.active === 1 ? (i18n.yes || 'Ja') : (i18n.no || 'Nein');
        
        return `
            <tr>
                <td>${observer.KK}</td>
                <td>${observer.VName} ${observer.NName}</td>
                <td>${seitDisplay}</td>
                <td>${aktivDisplay}</td>
                <td>${site.HbOrt}</td>
                <td>${site.GH.padStart(2, '0')}</td>
                <td>${site.HLG}° ${site.HLM}' ${site.HOW} / ${site.HBG}° ${site.HBM}' ${site.HNS}</td>
                <td>${site.NbOrt}</td>
                <td>${site.GN.padStart(2, '0')}</td>
                <td>${site.NLG}° ${site.NLM}' ${site.NOW} / ${site.NBG}° ${site.NBM}' ${site.NNS}</td>
            </tr>`;
    }).join('');
    
    const modalHtml = `
        <div class="modal fade" id="delete-observer-confirm-modal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.delete_observer || 'Beobachter löschen'}: ${observer.KK} ${observer.VName} ${observer.NName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-sm table-striped table-hover" style="font-size: 0.85rem;">
                                <thead class="table-primary sticky-top">
                                    <tr>
                                        <th>${i18n.kk_label || 'KK'}</th>
                                        <th>${i18n.name_label || 'Name'}</th>
                                        <th>${i18n.since_label || 'Seit'}</th>
                                        <th>${i18n.active_label || 'Aktiv'}</th>
                                        <th>${i18n.main_site_label || 'Hauptbeobachtungsort'}</th>
                                        <th>${i18n.region_label || 'GG'}</th>
                                        <th>${i18n.coordinates_label || 'Koordinaten'}</th>
                                        <th>${i18n.secondary_site_label || 'Nebenbeobachtungsort'}</th>
                                        <th>${i18n.region_label || 'GG'}</th>
                                        <th>${i18n.coordinates_label || 'Koordinaten'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-primary btn-sm" id="btn-delete-observer-no">${common.no || 'Nein'}</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btn-delete-observer-yes">${common.yes || 'Ja'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('delete-observer-confirm-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    // Handle Enter key - same as "No" button
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-delete-observer-no').click();
        }
    });
    
    // Handle "No" button - close dialog
    document.getElementById('btn-delete-observer-no').addEventListener('click', () => {
        modal.hide();
    });
    
    // Handle "Yes" button - delete observer
    document.getElementById('btn-delete-observer-yes').addEventListener('click', async () => {
        try {
            const resp = await fetch('/api/observers', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ KK: observer.KK })
            });
            
            const result = await resp.json();
            
            if (!resp.ok) {
                showErrorDialog(result.error || 'Fehler beim Löschen des Beobachters');
                return;
            }
            
            // Success
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${i18n.success_deleted || 'Beobachter erfolgreich gelöscht'}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => {
                successMsg.remove();
                if (window.location.pathname === '/observers') {
                    window.location.reload();
                }
            }, 2000);
            
        } catch (e) {
            showErrorDialog(e.message);
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Edit Observer Dialog Functions
async function showEditObserverDialog() {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    
    // Load observers first
    try {
        const resp = await fetch('/api/observers');
        const data = await resp.json();
        
        if (!data.observers || data.observers.length === 0) {
            showErrorDialog(i18n.error_loading_observers || 'No observers found');
            return;
        }
        
        // Create observer options sorted by KK
        const observers = data.observers.sort((a, b) => a.KK.localeCompare(b.KK));
        const observerOptions = observers.map(obs => 
            `<option value="${obs.KK}">${obs.KK} ${obs.VName} ${obs.NName}</option>`
        ).join('');
        
        const modalHtml = `
            <div class="modal fade" id="select-observer-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header py-2">
                            <h5 class="modal-title">${i18n.select_observer || 'Select Observer'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <label class="form-label">${i18n.select_observer_prompt || 'Select an observer:'}</label>
                            <select class="form-select" id="observer-select" required>
                                ${observerOptions}
                            </select>
                        </div>
                        <div class="modal-footer py-1">
                            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Cancel'}</button>
                            <button type="button" class="btn btn-primary btn-sm" id="btn-select-observer-ok">${common.ok || 'OK'}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('select-observer-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        // Handle OK button
        document.getElementById('btn-select-observer-ok').addEventListener('click', () => {
            const selectedKK = document.getElementById('observer-select').value;
            if (!selectedKK) {
                return;
            }
            
            const selectedObserver = observers.find(obs => obs.KK === selectedKK);
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => {
                modalEl.remove();
                showEditTypeDialog(selectedObserver);
            });
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
        
    } catch (e) {
        showErrorDialog(e.message);
    }
}

function showEditTypeDialog(observer) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    
    const modalHtml = `
        <div class="modal fade" id="edit-type-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.modify_title || 'Edit Observer'}: ${observer.KK} ${observer.VName} ${observer.NName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3">${i18n.modify_what_title || 'What would you like to edit?'}</p>
                        <div class="d-grid gap-2">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="editType" id="radio-edit-base" value="base" checked>
                                <label class="form-check-label" for="radio-edit-base">
                                    ${i18n.modify_base_data || 'Base Data'}
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="editType" id="radio-add-site" value="add-site">
                                <label class="form-check-label" for="radio-add-site">
                                    ${i18n.modify_add_site || 'Add Observation Site'}
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="editType" id="radio-edit-site" value="edit-site">
                                <label class="form-check-label" for="radio-edit-site">
                                    ${i18n.modify_edit_site || 'Edit Observation Site'}
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="editType" id="radio-delete-site" value="delete-site">
                                <label class="form-check-label" for="radio-delete-site">
                                    ${i18n.modify_delete_site || 'Delete Observation Site'}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Cancel'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-edit-type-ok">${common.ok || 'OK'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('edit-type-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    // Handle OK button
    document.getElementById('btn-edit-type-ok').addEventListener('click', () => {
        const selectedType = document.querySelector('input[name="editType"]:checked').value;
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            if (selectedType === 'base') {
                showEditBaseDataDialog(observer);
            } else if (selectedType === 'add-site') {
                showAddSiteDialog(observer);
            } else if (selectedType === 'edit-site') {
                showEditSiteDialog(observer);
            } else if (selectedType === 'delete-site') {
                showDeleteSiteDialog(observer);
            }
        });
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

function showEditBaseDataDialog(observer) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    
    const modalHtml = `
        <div class="modal fade" id="edit-base-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.edit_base_title || 'Edit Base Data'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-base-form">
                            <div class="row g-2">
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.kk_label || 'Observer Code (KK)'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="edit-kk" value="${observer.KK}" maxlength="2" required readonly style="background-color: #f0f0f0;">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.first_name_label || 'First Name'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="edit-vname" value="${observer.VName}" maxlength="15" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.last_name_label || 'Last Name'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="edit-nname" value="${observer.NName}" maxlength="15" required>
                                </div>
                            </div>
                            <div id="edit-base-error" class="text-danger mt-2" style="display:none; font-size: 12px;"></div>
                        </form>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Cancel'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-edit-base-ok">${common.ok || 'Save'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('edit-base-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const errEl = document.getElementById('edit-base-error');
    
    // Handle save button
    document.getElementById('btn-edit-base-ok').addEventListener('click', async () => {
        try {
            errEl.style.display = 'none';
            
            // Collect form data (only editable base data)
            const updatedData = {
                VName: document.getElementById('edit-vname').value.trim(),
                NName: document.getElementById('edit-nname').value.trim()
            };
            
            // Validate required fields
            if (!updatedData.VName || !updatedData.NName) {
                errEl.textContent = i18n.error_missing_required || 'Please fill in all required fields!';
                errEl.style.display = 'block';
                return;
            }
            
            // Send to API
            const resp = await fetch(`/api/observers/${observer.KK}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            
            const result = await resp.json();
            
            if (!resp.ok) {
                errEl.textContent = result.error || 'Error updating observer';
                errEl.style.display = 'block';
                return;
            }
            
            // Success - close modal
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${i18n.success_updated || 'Observer successfully updated'}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => {
                successMsg.remove();
                // Reload the page if we're on the observers page
                if (window.location.pathname === '/observers') {
                    window.location.reload();
                }
            }, 1500);
            
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

/**
 * Observer Site Management Functions
 * Functions for adding, editing, and deleting observation sites
 */

// Add new observation site
async function showAddSiteDialog(observer) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    const months = i18nStrings.months || {};
    const regions = i18nStrings.geographic_regions || {};
    
    // Generate month options
    const monthOptions = Object.keys(months).map(m => {
        const monthNum = parseInt(m);
        const monthName = months[m];
        return `<option value="${monthNum}">${monthName}</option>`;
    }).join('');
    
    // Generate year options (1950-2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 1950 + i;
        return `<option value="${year}">${year}</option>`;
    }).join('');
    
    // Generate region options
    const regionOptions = Object.keys(regions).map(regionNum => {
        const regionName = regions[regionNum];
        if (regionName) {
            return `<option value="${regionNum.padStart(2, '0')}">${regionNum.padStart(2, '0')} - ${regionName}</option>`;
        }
        return '';
    }).filter(opt => opt).join('');
    
    // Generate coordinate options
    const latDegOptions = Array.from({length: 91}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const lonDegOptions = Array.from({length: 181}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const minOptions = Array.from({length: 60}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    
    const modalHtml = `
        <div class="modal fade" id="add-site-modal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.modify_add_site || 'Add Observation Site'}: ${observer.KK} ${observer.VName} ${observer.NName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="add-site-form">
                            <div class="row g-2">
                                <!-- Since (Month/Year) and Active -->
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_month_label || 'Since (Month)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="site-seit-month" required>
                                        <option value="">--</option>
                                        ${monthOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_year_label || 'Since (Year)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="site-seit-year" required>
                                        <option value="">--</option>
                                        ${yearOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.active_label || 'Active'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="site-active" required>
                                        <option value="1">${i18n.yes || 'Yes'}</option>
                                        <option value="0">${i18n.no || 'No'}</option>
                                    </select>
                                </div>
                                
                                <!-- Main Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.main_site_label || 'Main Observation Site'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.main_site_label || 'Main Site'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="site-hb-ort" maxlength="20" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Region'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="site-gh" required>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Main Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Longitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="site-hlg" required>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="site-hlm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="site-how" style="max-width: 70px;" required>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Latitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="site-hbg" required>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="site-hbm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="site-hns" style="max-width: 70px;" required>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Secondary Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.secondary_site_label || 'Secondary Observation Site'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.secondary_site_label || 'Secondary Site'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="site-nb-ort" maxlength="20" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Region'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="site-gn" required>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Secondary Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Longitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="site-nlg" required>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="site-nlm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="site-now" style="max-width: 70px;" required>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Latitude'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="site-nbg" required>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="site-nbm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="site-nns" style="max-width: 70px;" required>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div id="site-error" class="text-danger mt-2" style="display:none; font-size: 12px;"></div>
                        </form>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Cancel'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-add-site-ok">${common.ok || 'Save'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('add-site-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const errEl = document.getElementById('site-error');
    
    // Handle Enter key
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('btn-add-site-ok').click();
        }
    });
    
    // Handle save
    document.getElementById('btn-add-site-ok').addEventListener('click', async () => {
        try {
            errEl.style.display = 'none';
            
            // Collect form data
            const siteData = {
                KK: observer.KK,
                VName: observer.VName,
                NName: observer.NName,
                seit_month: parseInt(document.getElementById('site-seit-month').value),
                seit_year: parseInt(document.getElementById('site-seit-year').value),
                active: parseInt(document.getElementById('site-active').value),
                HbOrt: document.getElementById('site-hb-ort').value.trim(),
                GH: document.getElementById('site-gh').value.padStart(2, '0'),
                HLG: parseInt(document.getElementById('site-hlg').value),
                HLM: parseInt(document.getElementById('site-hlm').value),
                HOW: document.getElementById('site-how').value,
                HBG: parseInt(document.getElementById('site-hbg').value),
                HBM: parseInt(document.getElementById('site-hbm').value),
                HNS: document.getElementById('site-hns').value,
                NbOrt: document.getElementById('site-nb-ort').value.trim(),
                GN: document.getElementById('site-gn').value.padStart(2, '0'),
                NLG: parseInt(document.getElementById('site-nlg').value),
                NLM: parseInt(document.getElementById('site-nlm').value),
                NOW: document.getElementById('site-now').value,
                NBG: parseInt(document.getElementById('site-nbg').value),
                NBM: parseInt(document.getElementById('site-nbm').value),
                NNS: document.getElementById('site-nns').value
            };
            
            // Validate
            if (!siteData.seit_month || !siteData.seit_year || !siteData.HbOrt || !siteData.GH || !siteData.NbOrt || !siteData.GN) {
                errEl.textContent = i18n.error_missing_required || 'Please fill in all required fields!';
                errEl.style.display = 'block';
                return;
            }
            
            // Send to API
            const resp = await fetch(`/api/observers/${observer.KK}/sites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(siteData)
            });
            
            const result = await resp.json();
            
            if (!resp.ok) {
                errEl.textContent = result.error || 'Error adding site';
                errEl.style.display = 'block';
                return;
            }
            
            // Success
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${i18n.success_added || 'Site successfully added'}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => {
                successMsg.remove();
                if (window.location.pathname === '/observers') {
                    window.location.reload();
                }
            }, 1500);
            
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Edit existing observation site
async function showEditSiteDialog(observer) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    
    // Load all sites for this observer
    try {
        const resp = await fetch(`/api/observers/${observer.KK}/sites`);
        const data = await resp.json();
        
        if (!data.sites || data.sites.length === 0) {
            showErrorDialog(i18n.error_no_sites || 'No observation sites found');
            return;
        }
        
        // Show first site with confirmation dialog (read-only)
        showEditSiteConfirmDialog(observer, data.sites, 0);
        
    } catch (e) {
        showErrorDialog(e.message);
    }
}

async function showEditSiteConfirmDialog(observer, sites, currentIndex) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    const months = i18nStrings.months || {};
    const regions = i18nStrings.geographic_regions || {};
    const site = sites[currentIndex];
    
    // Generate month options
    const monthOptions = Object.keys(months).map(m => {
        const monthNum = parseInt(m);
        const monthName = months[m];
        return `<option value="${monthNum}">${monthName}</option>`;
    }).join('');
    
    // Generate year options (1950-2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 1950 + i;
        return `<option value="${year}">${year}</option>`;
    }).join('');
    
    // Generate region options
    const regionOptions = Object.keys(regions).map(regionNum => {
        const regionName = regions[regionNum];
        if (regionName) {
            return `<option value="${regionNum.padStart(2, '0')}">${regionNum.padStart(2, '0')} - ${regionName}</option>`;
        }
        return '';
    }).filter(opt => opt).join('');
    
    // Generate coordinate options
    const latDegOptions = Array.from({length: 91}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const lonDegOptions = Array.from({length: 181}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const minOptions = Array.from({length: 60}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    
    const modalHtml = `
        <div class="modal fade" id="edit-site-confirm-modal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.modify_edit_site || 'Ortseintrag bearbeiten'}: ${observer.KK} ${observer.VName} ${observer.NName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-2">${i18n.modify_edit_question || 'Möchten Sie diesen Ortseintrag bearbeiten?'}</p>
                        <form id="edit-site-confirm-form">
                            <div class="row g-2">
                                <!-- Since (Month/Year) and Active -->
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_month_label || 'Seit (Monat)'}</label>
                                    <select class="form-select form-select-sm" id="confirm-edit-site-seit-month" disabled>
                                        <option value="">--</option>
                                        ${monthOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_year_label || 'Seit (Jahr)'}</label>
                                    <select class="form-select form-select-sm" id="confirm-edit-site-seit-year" disabled>
                                        <option value="">--</option>
                                        ${yearOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.active_label || 'Aktiv'}</label>
                                    <select class="form-select form-select-sm" id="confirm-edit-site-active" disabled>
                                        <option value="1">${i18n.yes || 'Ja'}</option>
                                        <option value="0">${i18n.no || 'Nein'}</option>
                                    </select>
                                </div>
                                
                                <!-- Main Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.main_site_label || 'Hauptbeobachtungsort'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.main_site_label || 'Hauptbeobachtungsort'}</label>
                                    <input type="text" class="form-control form-control-sm" id="confirm-edit-site-hb-ort" maxlength="20" disabled>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Gebiet (GG)'}</label>
                                    <select class="form-select form-select-sm" id="confirm-edit-site-gh" disabled>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Main Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Geogr. Länge'}</label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="confirm-edit-site-hlg" disabled>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="confirm-edit-site-hlm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="confirm-edit-site-how" style="max-width: 70px;" disabled>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Geogr. Breite'}</label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="confirm-edit-site-hbg" disabled>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="confirm-edit-site-hbm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="confirm-edit-site-hns" style="max-width: 70px;" disabled>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Secondary Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.secondary_site_label || 'Nebenbeobachtungsort'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.secondary_site_label || 'Nebenbeobachtungsort'}</label>
                                    <input type="text" class="form-control form-control-sm" id="confirm-edit-site-nb-ort" maxlength="20" disabled>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Gebiet (GG)'}</label>
                                    <select class="form-select form-select-sm" id="confirm-edit-site-gn" disabled>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Secondary Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Geogr. Länge'}</label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="confirm-edit-site-nlg" disabled>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="confirm-edit-site-nlm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="confirm-edit-site-now" style="max-width: 70px;" disabled>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Geogr. Breite'}</label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="confirm-edit-site-nbg" disabled>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="confirm-edit-site-nbm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="confirm-edit-site-nns" style="max-width: 70px;" disabled>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                        <p class="text-muted small mt-2">${i18n.edit_site_info || `Eintrag ${currentIndex + 1} von ${sites.length}`}</p>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Abbrechen'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-edit-site-no">${common.no || 'Nein'}</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btn-edit-site-yes">${common.yes || 'Ja'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('edit-site-confirm-modal');
    const modal = new bootstrap.Modal(modalEl);
    
    // Convert 2-digit year to 4-digit year
    const yearNum = parseInt(site.seit_year);
    const fullYear = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    
    // Pre-fill form with existing values (disabled)
    document.getElementById('confirm-edit-site-seit-month').value = site.seit_month;
    document.getElementById('confirm-edit-site-seit-year').value = fullYear;
    document.getElementById('confirm-edit-site-active').value = site.active;
    document.getElementById('confirm-edit-site-hb-ort').value = site.HbOrt;
    document.getElementById('confirm-edit-site-gh').value = site.GH.padStart(2, '0');
    document.getElementById('confirm-edit-site-hlg').value = site.HLG;
    document.getElementById('confirm-edit-site-hlm').value = site.HLM;
    document.getElementById('confirm-edit-site-how').value = site.HOW;
    document.getElementById('confirm-edit-site-hbg').value = site.HBG;
    document.getElementById('confirm-edit-site-hbm').value = site.HBM;
    document.getElementById('confirm-edit-site-hns').value = site.HNS;
    document.getElementById('confirm-edit-site-nb-ort').value = site.NbOrt;
    document.getElementById('confirm-edit-site-gn').value = site.GN.padStart(2, '0');
    document.getElementById('confirm-edit-site-nlg').value = site.NLG;
    document.getElementById('confirm-edit-site-nlm').value = site.NLM;
    document.getElementById('confirm-edit-site-now').value = site.NOW;
    document.getElementById('confirm-edit-site-nbg').value = site.NBG;
    document.getElementById('confirm-edit-site-nbm').value = site.NBM;
    document.getElementById('confirm-edit-site-nns').value = site.NNS;
    
    modal.show();
    
    // Handle Enter key - same as "No" button
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-edit-site-no').click();
        }
    });
    
    // Handle "No" button - show next site or close
    document.getElementById('btn-edit-site-no').addEventListener('click', () => {
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            if (currentIndex < sites.length - 1) {
                // Show next site
                showEditSiteConfirmDialog(observer, sites, currentIndex + 1);
            }
        });
    });
    
    // Handle "Yes" button - show editable form
    document.getElementById('btn-edit-site-yes').addEventListener('click', () => {
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            showEditSiteFormDialog(observer, sites, currentIndex);
        });
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

async function showEditSiteFormDialog(observer, sites, currentIndex) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    const months = i18nStrings.months || {};
    const regions = i18nStrings.geographic_regions || {};
    const site = sites[currentIndex];
    
    // Generate month options
    const monthOptions = Object.keys(months).map(m => {
        const monthNum = parseInt(m);
        const monthName = months[m];
        return `<option value="${monthNum}">${monthName}</option>`;
    }).join('');
    
    // Generate year options (1950-2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 1950 + i;
        return `<option value="${year}">${year}</option>`;
    }).join('');
    
    // Generate region options
    const regionOptions = Object.keys(regions).map(regionNum => {
        const regionName = regions[regionNum];
        if (regionName) {
            return `<option value="${regionNum.padStart(2, '0')}">${regionNum.padStart(2, '0')} - ${regionName}</option>`;
        }
        return '';
    }).filter(opt => opt).join('');
    
    // Generate coordinate options
    const latDegOptions = Array.from({length: 91}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const lonDegOptions = Array.from({length: 181}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const minOptions = Array.from({length: 60}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    
    const modalHtml = `
        <div class="modal fade" id="edit-site-modal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.modify_edit_site || 'Edit Observation Site'}: ${observer.KK} ${observer.VName} ${observer.NName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-site-form">
                            <div class="row g-2">
                                <!-- Since (Month/Year) and Active -->
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_month_label || 'Seit (Monat)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="edit-site-seit-month" required>
                                        <option value="">--</option>
                                        ${monthOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_year_label || 'Seit (Jahr)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="edit-site-seit-year" required>
                                        <option value="">--</option>
                                        ${yearOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.active_label || 'Aktiv'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="edit-site-active" required>
                                        <option value="1">${i18n.yes || 'Ja'}</option>
                                        <option value="0">${i18n.no || 'Nein'}</option>
                                    </select>
                                </div>
                                
                                <!-- Main Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.main_site_label || 'Hauptbeobachtungsort'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.main_site_label || 'Hauptbeobachtungsort'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="edit-site-hb-ort" maxlength="20" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Gebiet (GG)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="edit-site-gh" required>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Main Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Geogr. Länge'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="edit-site-hlg" required>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="edit-site-hlm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="edit-site-how" style="max-width: 70px;" required>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Geogr. Breite'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="edit-site-hbg" required>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="edit-site-hbm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="edit-site-hns" style="max-width: 70px;" required>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Secondary Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.secondary_site_label || 'Nebenbeobachtungsort'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.secondary_site_label || 'Nebenbeobachtungsort'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="edit-site-nb-ort" maxlength="20" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Gebiet (GG)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="edit-site-gn" required>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Secondary Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Geogr. Länge'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="edit-site-nlg" required>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="edit-site-nlm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="edit-site-now" style="max-width: 70px;" required>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Geogr. Breite'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="edit-site-nbg" required>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="edit-site-nbm" required>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="edit-site-nns" style="max-width: 70px;" required>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div id="edit-site-error" class="text-danger mt-2" style="display:none; font-size: 12px;"></div>
                        </form>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Abbrechen'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-edit-site-ok">${common.ok || 'OK'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('edit-site-modal');
    const modal = new bootstrap.Modal(modalEl);
    
    // Convert 2-digit year to 4-digit year
    const yearNum = parseInt(site.seit_year);
    const fullYear = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    
    // Pre-fill form with existing values
    document.getElementById('edit-site-seit-month').value = site.seit_month;
    document.getElementById('edit-site-seit-year').value = fullYear;
    document.getElementById('edit-site-active').value = site.active;
    document.getElementById('edit-site-hb-ort').value = site.HbOrt;
    document.getElementById('edit-site-gh').value = site.GH.padStart(2, '0');
    document.getElementById('edit-site-hlg').value = site.HLG;
    document.getElementById('edit-site-hlm').value = site.HLM;
    document.getElementById('edit-site-how').value = site.HOW;
    document.getElementById('edit-site-hbg').value = site.HBG;
    document.getElementById('edit-site-hbm').value = site.HBM;
    document.getElementById('edit-site-hns').value = site.HNS;
    document.getElementById('edit-site-nb-ort').value = site.NbOrt;
    document.getElementById('edit-site-gn').value = site.GN.padStart(2, '0');
    document.getElementById('edit-site-nlg').value = site.NLG;
    document.getElementById('edit-site-nlm').value = site.NLM;
    document.getElementById('edit-site-now').value = site.NOW;
    document.getElementById('edit-site-nbg').value = site.NBG;
    document.getElementById('edit-site-nbm').value = site.NBM;
    document.getElementById('edit-site-nns').value = site.NNS;
    
    modal.show();
    
    const errEl = document.getElementById('edit-site-error');
    
    // Handle Enter key
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('btn-edit-site-ok').click();
        }
    });
    
    // Store original seit for identifying the record
    const originalSeit = site.seit;
    
    // Handle save
    document.getElementById('btn-edit-site-ok').addEventListener('click', async () => {
        try {
            errEl.style.display = 'none';
            
            // Collect form data
            const yearValue = parseInt(document.getElementById('edit-site-seit-year').value);
            const siteData = {
                KK: observer.KK,
                VName: observer.VName,
                NName: observer.NName,
                seit_month: parseInt(document.getElementById('edit-site-seit-month').value),
                seit_year: yearValue % 100,  // Convert 4-digit to 2-digit year
                active: parseInt(document.getElementById('edit-site-active').value),
                HbOrt: document.getElementById('edit-site-hb-ort').value.trim(),
                GH: document.getElementById('edit-site-gh').value.padStart(2, '0'),
                HLG: parseInt(document.getElementById('edit-site-hlg').value),
                HLM: parseInt(document.getElementById('edit-site-hlm').value),
                HOW: document.getElementById('edit-site-how').value,
                HBG: parseInt(document.getElementById('edit-site-hbg').value),
                HBM: parseInt(document.getElementById('edit-site-hbm').value),
                HNS: document.getElementById('edit-site-hns').value,
                NbOrt: document.getElementById('edit-site-nb-ort').value.trim(),
                GN: document.getElementById('edit-site-gn').value.padStart(2, '0'),
                NLG: parseInt(document.getElementById('edit-site-nlg').value),
                NLM: parseInt(document.getElementById('edit-site-nlm').value),
                NOW: document.getElementById('edit-site-now').value,
                NBG: parseInt(document.getElementById('edit-site-nbg').value),
                NBM: parseInt(document.getElementById('edit-site-nbm').value),
                NNS: document.getElementById('edit-site-nns').value
            };
            
            // Validate
            if (!siteData.seit_month || !siteData.seit_year || !siteData.HbOrt || !siteData.GH || !siteData.NbOrt || !siteData.GN) {
                errEl.textContent = i18n.error_missing_required || 'Bitte füllen Sie alle Pflichtfelder aus!';
                errEl.style.display = 'block';
                return;
            }
            
            // Send to API - include originalSeit in body
            const resp = await fetch(`/api/observers/${observer.KK}/sites`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...siteData, originalSeit })
            });
            
            const result = await resp.json();
            
            if (!resp.ok) {
                errEl.textContent = result.error || 'Fehler beim Aktualisieren des Ortseintrags';
                errEl.style.display = 'block';
                return;
            }
            
            // Success
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${i18n.success_updated || 'Ortseintrag erfolgreich aktualisiert'}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => {
                successMsg.remove();
                if (window.location.pathname === '/observers') {
                    window.location.reload();
                }
            }, 1500);
            
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}

// Delete observation site
async function showDeleteSiteDialog(observer) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    
    // Load all sites for this observer
    try {
        const resp = await fetch(`/api/observers/${observer.KK}/sites`);
        const data = await resp.json();
        
        if (!data.sites || data.sites.length === 0) {
            showErrorDialog(i18n.error_no_sites || 'No observation sites found');
            return;
        }
        
        if (data.sites.length === 1) {
            showErrorDialog(i18n.error_last_site || 'Cannot delete the last observation site');
            return;
        }
        
        // Show first site with form dialog directly
        showDeleteSiteConfirmDialog(observer, data.sites, 0);
        
    } catch (e) {
        showErrorDialog(e.message);
    }
}

async function showDeleteSiteConfirmDialog(observer, sites, currentIndex = 0) {
    const i18n = i18nStrings.observers || {};
    const common = i18nStrings.common || {};
    const months = i18nStrings.months || {};
    const regions = i18nStrings.geographic_regions || {};
    const site = sites[currentIndex];
    
    // Generate month options
    const monthOptions = Object.keys(months).map(m => {
        const monthNum = parseInt(m);
        const monthName = months[m];
        return `<option value="${monthNum}">${monthName}</option>`;
    }).join('');
    
    // Generate year options (1950-2049)
    const yearOptions = Array.from({length: 100}, (_, i) => {
        const year = 1950 + i;
        return `<option value="${year}">${year}</option>`;
    }).join('');
    
    // Generate region options
    const regionOptions = Object.keys(regions).map(regionNum => {
        const regionName = regions[regionNum];
        if (regionName) {
            return `<option value="${regionNum.padStart(2, '0')}">${regionNum.padStart(2, '0')} - ${regionName}</option>`;
        }
        return '';
    }).filter(opt => opt).join('');
    
    // Generate coordinate options
    const latDegOptions = Array.from({length: 91}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const lonDegOptions = Array.from({length: 181}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    const minOptions = Array.from({length: 60}, (_, i) => `<option value="${i}">${i}</option>`).join('');
    
    const modalHtml = `
        <div class="modal fade" id="delete-site-modal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title">${i18n.modify_delete_site || 'Ortseintrag löschen'}: ${observer.KK} ${observer.VName} ${observer.NName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="delete-site-form">
                            <div class="row g-2">
                                <!-- Since (Month/Year) and Active -->
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_month_label || 'Seit (Monat)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="delete-site-seit-month" disabled>
                                        <option value="">--</option>
                                        ${monthOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.since_year_label || 'Seit (Jahr)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="delete-site-seit-year" disabled>
                                        <option value="">--</option>
                                        ${yearOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.active_label || 'Aktiv'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="delete-site-active" disabled>
                                        <option value="1">${i18n.yes || 'Ja'}</option>
                                        <option value="0">${i18n.no || 'Nein'}</option>
                                    </select>
                                </div>
                                
                                <!-- Main Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.main_site_label || 'Hauptbeobachtungsort'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.main_site_label || 'Hauptbeobachtungsort'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="delete-site-hb-ort" maxlength="20" disabled>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Gebiet (GG)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="delete-site-gh" disabled>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Main Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Geogr. Länge'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="delete-site-hlg" disabled>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="delete-site-hlm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="delete-site-how" style="max-width: 70px;" disabled>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Geogr. Breite'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="delete-site-hbg" disabled>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="delete-site-hbm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="delete-site-hns" style="max-width: 70px;" disabled>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Secondary Observation Site -->
                                <div class="col-12 mt-2">
                                    <h6 class="mb-1">${i18n.secondary_site_label || 'Nebenbeobachtungsort'}</h6>
                                </div>
                                <div class="col-md-8">
                                    <label class="form-label small mb-0">${i18n.secondary_site_label || 'Nebenbeobachtungsort'} <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control form-control-sm" id="delete-site-nb-ort" maxlength="20" disabled>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small mb-0">${i18n.region_label || 'Gebiet (GG)'} <span class="text-danger">*</span></label>
                                    <select class="form-select form-select-sm" id="delete-site-gn" disabled>
                                        <option value="">--</option>
                                        ${regionOptions}
                                    </select>
                                </div>
                                
                                <!-- Secondary Site Coordinates -->
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.longitude_label || 'Geogr. Länge'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="delete-site-nlg" disabled>
                                            ${lonDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="delete-site-nlm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="delete-site-now" style="max-width: 70px;" disabled>
                                            <option value="O">O</option>
                                            <option value="W">W</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small mb-0">${i18n.latitude_label || 'Geogr. Breite'} <span class="text-danger">*</span></label>
                                    <div class="input-group input-group-sm">
                                        <select class="form-select" id="delete-site-nbg" disabled>
                                            ${latDegOptions}
                                        </select>
                                        <span class="input-group-text">°</span>
                                        <select class="form-select" id="delete-site-nbm" disabled>
                                            ${minOptions}
                                        </select>
                                        <span class="input-group-text">'</span>
                                        <select class="form-select" id="delete-site-nns" style="max-width: 70px;" disabled>
                                            <option value="N">N</option>
                                            <option value="S">S</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${common.cancel || 'Abbrechen'}</button>
                        <button type="button" class="btn btn-primary btn-sm" id="btn-delete-site-no">${common.no || 'Nein'}</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" id="btn-delete-site-yes">${common.yes || 'Ja'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('delete-site-modal');
    const modal = new bootstrap.Modal(modalEl);
    
    // Convert 2-digit year to 4-digit for display
    const yearNum = parseInt(site.seit_year);
    const fullYear = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    
    // Pre-fill form with existing values (disabled)
    document.getElementById('delete-site-seit-month').value = site.seit_month;
    document.getElementById('delete-site-seit-year').value = fullYear;
    document.getElementById('delete-site-active').value = site.active;
    document.getElementById('delete-site-hb-ort').value = site.HbOrt;
    document.getElementById('delete-site-gh').value = site.GH.padStart(2, '0');
    document.getElementById('delete-site-hlg').value = site.HLG;
    document.getElementById('delete-site-hlm').value = site.HLM;
    document.getElementById('delete-site-how').value = site.HOW;
    document.getElementById('delete-site-hbg').value = site.HBG;
    document.getElementById('delete-site-hbm').value = site.HBM;
    document.getElementById('delete-site-hns').value = site.HNS;
    document.getElementById('delete-site-nb-ort').value = site.NbOrt;
    document.getElementById('delete-site-gn').value = site.GN.padStart(2, '0');
    document.getElementById('delete-site-nlg').value = site.NLG;
    document.getElementById('delete-site-nlm').value = site.NLM;
    document.getElementById('delete-site-now').value = site.NOW;
    document.getElementById('delete-site-nbg').value = site.NBG;
    document.getElementById('delete-site-nbm').value = site.NBM;
    document.getElementById('delete-site-nns').value = site.NNS;
    
    modal.show();
    
    // Handle Enter key - same as "No" button
    modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-delete-site-no').click();
        }
    });
    
    // Handle "No" button - show next site or close
    document.getElementById('btn-delete-site-no').addEventListener('click', () => {
        modal.hide();
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            if (currentIndex < sites.length - 1) {
                // Show next site
                showDeleteSiteConfirmDialog(observer, sites, currentIndex + 1);
            }
        });
    });
    
    // Handle "Yes" button - delete the site
    document.getElementById('btn-delete-site-yes').addEventListener('click', async () => {
        try {
            const resp = await fetch(`/api/observers/${observer.KK}/sites`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seit: site.seit })
            });
            
            const result = await resp.json();
            
            if (!resp.ok) {
                showErrorDialog(result.error || 'Fehler beim Löschen des Ortseintrags');
                return;
            }
            
            // Success
            modal.hide();
            modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
            successMsg.style.cssText = 'z-index:9999;min-width:300px;';
            successMsg.innerHTML = `
                <strong>✓</strong> ${i18n.success_deleted || 'Ortseintrag erfolgreich gelöscht'}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => {
                successMsg.remove();
                if (window.location.pathname === '/observers') {
                    window.location.reload();
                }
            }, 1500);
            
        } catch (e) {
            showErrorDialog(e.message);
        }
    });
    
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
}
