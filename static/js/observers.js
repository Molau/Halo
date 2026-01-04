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
 * Display observers in table
 */
function displayObservers() {
    const tbody = document.getElementById('observers-table-body');
    const resultsContainer = document.getElementById('results-container');
    const recordCount = document.getElementById('record-count');
    const pageInfo = document.getElementById('page-info');
    const compactPageInfo = document.getElementById('compact-page-info');
    const btnExitObservers = document.getElementById('btn-exit-observers');
    
    tbody.innerHTML = '';
    
        if (filteredObservers.length === 0) {
            const noData = (i18n && i18n.messages && i18n.messages.no_observers) || 'Keine Beobachter gefunden';
            tbody.innerHTML = `<tr><td colspan="10" class="text-center">${noData}</td></tr>`;
            compactPageInfo.textContent = '';
            pageInfo.textContent = '';
        } else {
        // Calculate pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredObservers.length);
        const pageObservers = filteredObservers.slice(startIndex, endIndex);
            const yesText = (i18n && i18n.observers && i18n.observers.yes) ? i18n.observers.yes : '';
            const noText = (i18n && i18n.observers && i18n.observers.no) ? i18n.observers.no : '';
        
        pageObservers.forEach(obs => {
            const row = document.createElement('tr');
            
            // Format coordinates
            const hCoords = `${obs.HLG}° ${obs.HLM}' ${obs.HOW} / ${obs.HBG}° ${obs.HBM}' ${obs.HNS}`;
            const nCoords = `${obs.NLG}° ${obs.NLM}' ${obs.NOW} / ${obs.NBG}° ${obs.NBM}' ${obs.NNS}`;
            
            row.innerHTML = `
                <td>${obs.KK}</td>
                <td>${obs.VName} ${obs.NName}</td>
                <td>${obs.seit}</td>
                    <td>${obs.aktiv === '1' ? yesText : noText}</td>
                <td>${obs.HbOrt}</td>
                <td>${obs.GH}</td>
                <td style="font-size: 0.9em;">${hCoords}</td>
                <td>${obs.NbOrt}</td>
                <td>${obs.GN}</td>
                <td style="font-size: 0.9em;">${nCoords}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update pagination info (compact style in center)
        const maxPage = Math.ceil(filteredObservers.length / pageSize);
            const rowPrefix = i18n && i18n.observers && i18n.observers.row_range_prefix ? i18n.observers.row_range_prefix : 'Zeile';
            const rowOf = i18n && i18n.observers && i18n.observers.row_range_of ? i18n.observers.row_range_of : 'von';
            compactPageInfo.textContent = `${rowPrefix} ${startIndex + 1}-${endIndex} ${rowOf} ${filteredObservers.length}`;
        
        // Update button states
        document.getElementById('btn-first-page').disabled = currentPage === 1;
        document.getElementById('btn-prev-page').disabled = currentPage === 1;
        document.getElementById('btn-next-page').disabled = currentPage === maxPage;
        document.getElementById('btn-last-page').disabled = currentPage === maxPage;
    }
    
    // Update record count in bottom right corner
    const recordsLabel = i18n && i18n.observers ? i18n.observers.records_label : 'Datensätze';
    recordCount.textContent = `${filteredObservers.length} ${recordsLabel}`;
    pageInfo.textContent = '';
    
    // Show results container and exit button
    resultsContainer.style.display = 'block';
    btnExitObservers.style.display = 'block';
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
