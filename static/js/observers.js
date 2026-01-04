/**
 * Observer display and filter functionality
 */

let allObservers = [];
let filteredObservers = [];
let observersList = [];
let regionsList = [];
let currentPage = 1;
const pageSize = 50;  // Show 50 observers per page
let i18n = null;

// Show filter dialog on page load
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        await ensureCurrentLanguage();
        await loadI18n(window.currentLanguage);
        await loadDropdownData();
        showFilterDialog();
    })();
    
    // Set up event listeners
    document.getElementById('filter-type').addEventListener('change', handleFilterTypeChange);
    document.getElementById('apply-filter').addEventListener('click', applyFilter);
    document.getElementById('cancel-filter').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // Pagination event listeners
    document.getElementById('btn-first-page')?.addEventListener('click', () => goToPage(1));
    document.getElementById('btn-prev-page')?.addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('btn-next-page')?.addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('btn-last-page')?.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredObservers.length / pageSize);
        goToPage(maxPage);
    });
    
    // Exit button
    document.getElementById('btn-exit-observers')?.addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // ESC key to return to main menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Check if any modal is currently shown
            const openModals = document.querySelectorAll('.modal.show');
            if (openModals.length === 0) {
                // No modals open - exit to main page
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/';
            }
            // If modal is open, let Bootstrap handle ESC to close it
        }
    });
});

async function loadI18n() {
    try {
        const response = await fetch(`/api/i18n/${window.currentLanguage || 'de'}`);
        i18n = await response.json();
    } catch (error) {
        console.error('Error loading i18n:', error);
    }
}

async function ensureCurrentLanguage() {
    try {
        const response = await fetch('/api/language');
        if (response.ok) {
            const data = await response.json();
            if (data && data.language) {
                window.currentLanguage = data.language;
            }
        }
    } catch (error) {
        console.error('Error ensuring current language:', error);
    }
    if (!window.currentLanguage) {
        window.currentLanguage = 'de';
    }
}

/**
 * Load dropdown data for filters
 */
async function loadDropdownData() {
    try {
        // Load observers list
        const obsResponse = await fetch('/api/observers/list');
        const obsData = await obsResponse.json();
        observersList = obsData.observers;
        
        // Load regions list
        const regResponse = await fetch('/api/observers/regions');
        const regData = await regResponse.json();
        regionsList = regData.regions;
        
        populateDropdowns();
    } catch (error) {
        console.error('Error loading dropdown data:', error);
    }
}

/**
 * Populate dropdown menus with data
 */
function populateDropdowns() {
    // Populate observers dropdown
    const kkSelect = document.getElementById('filter-select-kk');
    const prompt = (i18n && i18n.observers && i18n.observers.select_prompt) ? i18n.observers.select_prompt : 'Bitte auswählen...';
    kkSelect.innerHTML = `<option value="">${prompt}</option>`;
    observersList.forEach(obs => {
        // Skip observers with missing data
        if (!obs.KK || !obs.VName || !obs.NName) {
            return;
        }
        const option = document.createElement('option');
        option.value = obs.KK;
        option.textContent = `${obs.KK} - ${obs.VName} ${obs.NName}`.trim();
        kkSelect.appendChild(option);
    });
    
    // Populate regions dropdown
    const regionSelect = document.getElementById('filter-select-region');
    regionSelect.innerHTML = `<option value="">${prompt}</option>`;
    regionsList.forEach(region => {
        const option = document.createElement('option');
        option.value = region.number;
        option.textContent = `GG ${region.number} - ${region.name}`;
        regionSelect.appendChild(option);
    });
}

/**
 * Show filter dialog
 */
function showFilterDialog() {
    const modal = new bootstrap.Modal(document.getElementById('filter-dialog'));
    modal.show();
    
    // Reset filter
    document.getElementById('filter-type').value = 'none';
    handleFilterTypeChange();
}

/**
 * Handle filter type change
 */
function handleFilterTypeChange() {
    const filterType = document.getElementById('filter-type').value;
    const filterInput = document.getElementById('filter-input');
    const kkSelect = document.getElementById('filter-select-kk');
    const siteInput = document.getElementById('filter-input-site');
    const regionSelect = document.getElementById('filter-select-region');
    
    // Hide all inputs
    kkSelect.style.display = 'none';
    siteInput.style.display = 'none';
    regionSelect.style.display = 'none';
    
    if (filterType === 'none') {
        filterInput.style.display = 'none';
    } else {
        filterInput.style.display = 'block';
        
        if (filterType === 'kk') {
            kkSelect.style.display = 'block';
        } else if (filterType === 'site') {
            siteInput.style.display = 'block';
        } else if (filterType === 'region') {
            regionSelect.style.display = 'block';
        }
    }
}

/**
 * Apply filter and load observers
 */
async function applyFilter() {
    const filterType = document.getElementById('filter-type').value;
    let filterValue = '';
    
    if (filterType === 'kk') {
        filterValue = document.getElementById('filter-select-kk').value;
    } else if (filterType === 'site') {
        filterValue = document.getElementById('filter-input-site').value.trim();
    } else if (filterType === 'region') {
        filterValue = document.getElementById('filter-select-region').value;
    }
    
    // Validate
    if (filterType !== 'none' && !filterValue) {
        const msg = i18n && i18n.observers ? i18n.observers.warning_select_value : 'Bitte wählen Sie einen Wert aus.';
        showWarning(msg);
        return;
    }
    
    // Get latest-only checkbox state
    const latestOnly = document.getElementById('show-latest-only').checked;
    
    // Close dialog
    const modal = bootstrap.Modal.getInstance(document.getElementById('filter-dialog'));
    modal.hide();
    
    // Load observers
    await loadObservers(filterType, filterValue, latestOnly);
}

/**
 * Load observers with filter
 */
async function loadObservers(filterType, filterValue, latestOnly) {
    try {
        const url = `/api/observers?filter_type=${filterType}&filter_value=${encodeURIComponent(filterValue)}&latest_only=${latestOnly}`;
        const response = await fetch(url);
        const data = await response.json();
        
        filteredObservers = data.observers;
        currentPage = 1;  // Reset to first page
        displayObservers();
    } catch (error) {
        console.error('Error loading observers:', error);
        const errMsg = i18n && i18n.observers ? i18n.observers.loading_error : 'Fehler beim Laden der Beobachter.';
        showWarning(errMsg);
    }
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const maxPage = Math.ceil(filteredObservers.length / pageSize);
    if (page < 1 || page > maxPage) return;
    
    currentPage = page;
    displayObservers();
}

/**
 * Display observers in modal table
 */
function displayObservers() {
    if (filteredObservers.length === 0) {
        showWarningModal((i18n && i18n.messages && i18n.messages.no_observers) || 'Keine Beobachter gefunden');
        return;
    }
    
    const yesText = (i18n && i18n.observers && i18n.observers.yes) ? i18n.observers.yes : 'Ja';
    const noText = (i18n && i18n.observers && i18n.observers.no) ? i18n.observers.no : 'Nein';
    const recordsLabel = i18n && i18n.observers ? i18n.observers.records_label : 'Datensätze';
    
    // Build table rows
    let rows = '';
    filteredObservers.forEach(obs => {
        // Format coordinates
        const hCoords = `${obs.HLG}° ${obs.HLM}' ${obs.HOW} / ${obs.HBG}° ${obs.HBM}' ${obs.HNS}`;
        const nCoords = `${obs.NLG}° ${obs.NLM}' ${obs.NOW} / ${obs.NBG}° ${obs.NBM}' ${obs.NNS}`;
        
        // Format GG with two digits
        const ghFormatted = String(obs.GH).padStart(2, '0');
        const gnFormatted = String(obs.GN).padStart(2, '0');
        
        rows += `
            <tr>
                <td>${obs.KK}</td>
                <td>${obs.VName} ${obs.NName}</td>
                <td>${obs.seit}</td>
                <td>${obs.aktiv === '1' ? yesText : noText}</td>
                <td>${obs.HbOrt}</td>
                <td>${ghFormatted}</td>
                <td style="font-size: 0.9em;">${hCoords}</td>
                <td>${obs.NbOrt}</td>
                <td>${gnFormatted}</td>
                <td style="font-size: 0.9em;">${nCoords}</td>
            </tr>
        `;
    });
    
    const modalHtml = `
        <div class="modal fade" id="observers-modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-xl">
                <div class="modal-content">
                    <div class="modal-header py-1">
                        <h6 class="modal-title mb-0">${(i18n && i18n.observers && i18n.observers.title) || 'Beobachter'} (${filteredObservers.length} ${recordsLabel})</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-2" style="max-height: 70vh; overflow-y: auto;">
                        <table class="table table-sm table-hover table-striped">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th>KK</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.name) || 'Name'}</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.since) || 'Seit'}</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.active) || 'Aktiv'}</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.primary_site) || 'HbOrt'}</th>
                                    <th>GH</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.coordinates) || 'Koordinaten'}</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.secondary_site) || 'NbOrt'}</th>
                                    <th>GN</th>
                                    <th>${(i18n && i18n.observers && i18n.observers.coordinates) || 'Koordinaten'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer py-1">
                        <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">${(i18n && i18n.ui && i18n.ui.buttons && i18n.ui.buttons.close) || 'Schließen'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('observers-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modalEl = document.getElementById('observers-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    // Clean up after modal is hidden
    modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
    });
}

/**
 * Show warning message
 */
function showWarning(message) {
    const alertHtml = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const container = document.querySelector('.modal-body');
    const existing = container.querySelector('.alert');
    if (existing) existing.remove();
    
    container.insertAdjacentHTML('afterbegin', alertHtml);
    
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}
