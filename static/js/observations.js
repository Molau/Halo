// Observations page functionality - Exact translation from H_BEOBNG.PAS zeibeobachtung()
document.addEventListener('DOMContentLoaded', function() {

    let currentPage = 1;
    const pageSize = 50;  // Pascal shows 50 rows at a time (zeile variable)
    let allObservations = [];
    let filteredObservations = [];
    let displayMode = 'kurz';  // Default to compact mode (Eingabeart = 'Z')
    let currentDetailIndex = 0;
    let i18n = null;
    
    // Filter state (matching Pascal auswahl, auswahl2)
    let filterCriterion1 = 'none';  // auswahl: none, observer, region
    let filterValue1 = null;
    let filterCriterion2 = 'none';  // auswahl2: none, date, month, year, halo-type
    let filterValue2 = null;
    
    // Elements
    const filterDialog = document.getElementById('filter-dialog');
    

    const btnApplyFilter = document.getElementById('btn-apply-filter');
    const btnCancelFilter = document.getElementById('btn-cancel-filter');
    const compactView = document.getElementById('compact-view');
    const detailView = document.getElementById('detail-view');
    const compactTbody = document.getElementById('compact-tbody');
    const detailContent = document.getElementById('detail-content');
    const pageInfo = document.getElementById('page-info');
    const recordCount = document.getElementById('record-count');
    const loadingSpinner = document.getElementById('loading-spinner');

    function showLoadingOverlay(message) {
        const overlay = document.createElement('div');
        overlay.className = 'modal fade';
        overlay.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="background-color:#f8f9fa;">
                    <div class="modal-body text-center py-4">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const bsModal = new bootstrap.Modal(overlay, { backdrop: 'static', keyboard: false });
        bsModal.show();
        return { overlay, bsModal };
    }

    function hideLoadingOverlay(instance) {
        if (!instance) return;
        instance.bsModal.hide();
        setTimeout(() => {
            instance.overlay.remove();
            // Remove any leftover Bootstrap modal backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            // Restore body scroll
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
        }, 300);
    }
    
    function showWarning(message) {
        const warningAlert = document.createElement('div');
        warningAlert.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        warningAlert.style.cssText = 'z-index:9999;min-width:300px;max-width:500px;';
        warningAlert.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(warningAlert);
        setTimeout(() => warningAlert.remove(), 5000);
    }
    
    // Filter form elements
    const filterCriterion1Select = document.getElementById('filter-criterion-1');
    const filter1Input = document.getElementById('filter-1-input');
    const filter1SelectElem = document.getElementById('filter-1-select');
    const filterCriterion2Select = document.getElementById('filter-criterion-2');
    const filter2Input = document.getElementById('filter-2-input');
    const filter2Value = document.getElementById('filter-2-value');
    const filter2SelectElem = document.getElementById('filter-2-select');
    const btnExitObservations = document.getElementById('btn-exit-observations');
    





    // Pagination buttons
    const btnFirstPage = document.getElementById('btn-first-page');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const btnLastPage = document.getElementById('btn-last-page');
    const compactPageInfo = document.getElementById('compact-page-info');
    
    // Initialize
    async function initialize() {
        await loadI18n();
        await loadObserversData();  // Load observers early for dropdown
        
        // Check if data is already loaded on the server
        try {
            const response = await fetch('/api/observations?limit=1');
            if (response.ok) {
                const data = await response.json();
                if (data.total > 0 && data.file) {
                    // Data is loaded on server, fetch all observations
                    const fullResponse = await fetch('/api/observations?limit=200000');
                    if (fullResponse.ok) {
                        const fullData = await fullResponse.json();
                        if (!window.haloData) {
                            window.haloData = { observations: [], fileName: null, isLoaded: false, isDirty: false };
                        }
                        window.haloData.observations = fullData.observations;
                        window.haloData.fileName = fullData.file;
                        window.haloData.isLoaded = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking server data:', error);
        }
        
        // Show filter dialog
        showFilterDialog();
    }
    
    initialize();
    
    // Event listeners
    btnApplyFilter.addEventListener('click', applyFilters);
    btnCancelFilter.addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // Enter key support for filter inputs (only if they exist)
    if (filter2Value) {
        filter2Value.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
            }
        });
    }
    
    btnExitObservations.addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // Pagination event listeners
    btnFirstPage?.addEventListener('click', () => goToPage(1));
    btnPrevPage?.addEventListener('click', () => goToPage(currentPage - 1));
    btnNextPage?.addEventListener('click', () => goToPage(currentPage + 1));
    btnLastPage?.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredObservations.length / pageSize);
        goToPage(maxPage);
    });
    
    // ESC key handler - exit observations display
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
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
    
    filterCriterion1Select.addEventListener('change', handleFilter1Change);
    filterCriterion2Select.addEventListener('change', (e) => {

        handleFilter2Change();
    });

    
    document.getElementById('btn-prev-detail').addEventListener('click', () => navigateDetail(-1));
    document.getElementById('btn-next-detail').addEventListener('click', () => navigateDetail(1));
    
    async function loadI18n() {
        try {
            const response = await fetch(`/api/i18n/${window.currentLanguage || 'de'}`);
            i18n = await response.json();
            updateFilterDialogText();
        } catch (error) {
            console.error('Error loading i18n:', error);
        }
    }
    
    async function loadObserversData() {
        try {
            const response = await fetch('/api/observers');
            if (response.ok) {
                const data = await response.json();
                if (window.haloData) {
                    window.haloData.observers = data.observers || [];
                }
            }
        } catch (error) {
            console.warn('Could not load observers:', error);
        }
    }
    
    // Expose function globally so main.js can call it when language switches
    window.reloadObservationsI18n = loadI18n;
    
    function updateFilterDialogText() {
        if (!i18n || !i18n.ui) return;
        
        const ui = i18n.ui;
        
        // Modal title
        document.getElementById('filterDialogLabel').textContent = ui.filter_dialog.title;
        
        // Filter 1 label and options
        document.querySelector('#filter-criterion-1').previousElementSibling.textContent = '1. ' + ui.filter_dialog.question_1;
        const filter1Select = document.getElementById('filter-criterion-1');
        filter1Select.options[0].textContent = ui.filter_dialog.no_criterion;
        filter1Select.options[1].textContent = ui.filter_dialog.observer_name || ui.filter_dialog.observer_code;
        filter1Select.options[2].textContent = ui.filter_dialog.region;
        
        // Filter 2 label and options
        document.querySelector('#filter-criterion-2').previousElementSibling.textContent = '2. ' + ui.filter_dialog.question_2;
        if (filterCriterion2Select && filterCriterion2Select.options.length >= 5) {
            const opt = filterCriterion2Select.options;
            opt[0].textContent = ui.filter_dialog.no_criterion;
            opt[1].textContent = ui.filter_dialog.date;
            opt[2].textContent = ui.filter_dialog.month;
            opt[3].textContent = ui.filter_dialog.year;
            opt[4].textContent = ui.filter_dialog.halo_type;
        }
        
        // Buttons
        document.getElementById('btn-cancel-filter').textContent = ui.buttons.cancel;
        const applyBtn = document.getElementById('btn-apply-filter');
        applyBtn.childNodes[applyBtn.childNodes.length - 1].textContent = ui.buttons.apply;
        
        // Loading text
        const loadingText = document.querySelector('#loading-spinner p');
        if (loadingText) loadingText.textContent = ui.messages.loading;
        
        // Update placeholders if visible
        const criterion1 = filterCriterion1Select.value;

        const criterion2 = filterCriterion2Select.value;
        if (criterion2 === 'date' && filter2Value.placeholder) {
            filter2Value.placeholder = ui.placeholders.date;
        } else if (criterion2 === 'month' && filter2Value.placeholder) {
            filter2Value.placeholder = ui.placeholders.month;
        } else if (criterion2 === 'year' && filter2Value.placeholder) {
            filter2Value.placeholder = ui.placeholders.year;
        }
        
        // Update dropdowns if populated
        if (criterion1 === 'observer' && filter1SelectElem.options.length > 0) {
            populateObserverSelect();
        } else if (criterion1 === 'region' && filter1SelectElem.options.length > 0) {
            populateRegionSelectForFilter1();
        }
        if (criterion2 === 'halo-type' && filter2SelectElem.options.length > 0) {
            populateHaloTypeSelect();
        }
        
        // Update page info text if observations are displayed
        if (filteredObservations.length > 0) {
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, filteredObservations.length);
            const rowText = ui.messages.row;
            const ofText = ui.messages.of;
            pageInfo.textContent = `${rowText} ${startIndex + 1}-${endIndex} ${ofText} ${filteredObservations.length}`;
        }
        
        // Update record count if displayed
        if (recordCount && filteredObservations.length > 0) {
            recordCount.textContent = `${filteredObservations.length} ${ui.file_info.observations_count}`;
        }
        
        // Update exit button text
        const exitText = document.getElementById('exit-text');
        if (exitText) {
            exitText.textContent = ui.buttons.exit;
        }
    }
    
    async function loadObservations() {
        try {
            compactTbody.textContent = i18n && i18n.ui ? i18n.ui.messages.loading_short : 'Loading...';
            
            // Load observations
            const obsResponse = await fetch('/api/observations?limit=200000');
            if (!obsResponse.ok) throw new Error('Failed to load observations');
            
            const obsData = await obsResponse.json();
            allObservations = obsData.observations;
            
            // Load observers
            try {
                const obsrResponse = await fetch('/api/observers');
                if (obsrResponse.ok) {
                    const obsrData = await obsrResponse.json();
                    if (window.haloData) {
                        window.haloData.observers = obsrData.observers || [];
                    }
                }
            } catch (err) {
                console.warn('Could not load observers:', err);
            }
            
            // Sync with global data store
            if (window.haloData) {
                window.haloData.observations = allObservations;
                window.haloData.fileName = obsData.file;
                window.haloData.isLoaded = true;
            }
            
            applyFiltersInternal();
            updateFileInfo(obsData.file, allObservations.length);
        } catch (error) {
            console.error('Error loading observations:', error);
            compactTbody.textContent = i18n.ui.messages.error_loading;
        }
    }
    
    function updateFileInfo(fileName, count) {
        const fileInfo = document.getElementById('file-info');
        const fileNameElem = document.getElementById('file-name');
        const obsCountElem = document.getElementById('obs-count');
        
        if (fileInfo && fileNameElem && obsCountElem && i18n && i18n.ui) {
            fileNameElem.textContent = fileName;
            const countText = i18n.ui.file_info.observations_count;
            obsCountElem.textContent = `${count} ${countText}`;
            fileInfo.style.display = 'flex';
        }
    }
    
    // Expose function globally so it can be called when language switches
    window.updateFileInfoLanguage = function() {
        if (allObservations.length > 0) {
            const fileName = document.getElementById('file-name')?.textContent;
            updateFileInfo(fileName, allObservations.length);
        }
    };
    
    function showFilterDialog() {
        const modal = new bootstrap.Modal(filterDialog);
        modal.show();
    }
    
    function handleFilter1Change() {
        const value = filterCriterion1Select.value;
        
        if (value === 'none') {
            filter1Input.style.display = 'none';
        } else if (value === 'observer') {
            filter1Input.style.display = 'block';
            filter1SelectElem.style.display = 'block';
            populateObserverSelect();
            setTimeout(() => filter1SelectElem.focus(), 50);
        } else if (value === 'region') {
            filter1Input.style.display = 'block';
            filter1SelectElem.style.display = 'block';
            populateRegionSelectForFilter1();
            setTimeout(() => filter1SelectElem.focus(), 50);
        }
    }
    
    function handleFilter2Change() {
        const value = filterCriterion2Select.value;

        
        if (value === 'none') {
            filter2Input.style.display = 'none';
        } else if (value === 'date') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'block';
            filter2SelectElem.style.display = 'none';
            filter2Value.placeholder = i18n && i18n.ui ? i18n.ui.placeholders.date : '';
            setTimeout(() => filter2Value.focus(), 50);
        } else if (value === 'month') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'block';
            filter2SelectElem.style.display = 'none';
            filter2Value.placeholder = i18n && i18n.ui ? i18n.ui.placeholders.month : '';
            setTimeout(() => filter2Value.focus(), 50);
        } else if (value === 'year') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'block';
            filter2SelectElem.style.display = 'none';
            filter2Value.placeholder = i18n && i18n.ui ? i18n.ui.placeholders.year : '';
            setTimeout(() => filter2Value.focus(), 50);
        } else if (value === 'halo-type') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'none';
            filter2SelectElem.style.display = 'block';
            populateHaloTypeSelect();
            setTimeout(() => filter2SelectElem.focus(), 50);
        }
    }
    
    function populateObserverSelect() {
        // Load from global observer data
        filter1SelectElem.innerHTML = '';
        
        // Get observers from window.haloData if available, or extract from observations
        let observers = [];
        
        if (window.haloData && window.haloData.observers && Array.isArray(window.haloData.observers)) {
            observers = window.haloData.observers.map(obs => ({
                KK: parseInt(obs.KK),
                VName: obs.VName || '',
                NName: obs.NName || ''
            })).sort((a,b) => a.KK - b.KK);
        } else {
            // Fallback: extract from observations
            const uniqueK = [...new Set(allObservations.map(o => o.k))];
            observers = uniqueK.sort((a,b) => a-b).map(k => ({ KK: k, VName: '', NName: '' }));
        }
        
        observers.forEach(obs => {
            const option = document.createElement('option');
            option.value = obs.KK;
            const name = `${obs.VName} ${obs.NName}`.trim();
            option.textContent = `${String(obs.KK).padStart(2, '0')} ${name}`;
            filter1SelectElem.appendChild(option);
        });
    }

    function populateRegionSelectForFilter1() {
        filter1SelectElem.innerHTML = '';
        if (i18n && i18n.geographic_regions) {
            for (let i = 1; i <= 39; i++) {
                const regionName = i18n.geographic_regions[String(i)];
                if (regionName && regionName.trim()) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `${String(i).padStart(2, '0')} - ${regionName}`;
                    filter1SelectElem.appendChild(option);
                }
            }
        }
    }
    
    function populateHaloTypeSelect() {
        const unknown = i18n.ui.filter_dialog.unknown;
        filter2SelectElem.innerHTML = '';
        if (i18n && i18n.halo_types) {
            for (let i = 1; i <= 99; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${String(i).padStart(2, '0')} - ${i18n.halo_types[i] || unknown}`;
                filter2SelectElem.appendChild(option);
            }
        }
    }
    
    function populateRegionSelect() {

        filter2SelectElem.innerHTML = '';


        
        if (i18n && i18n.geographic_regions) {

            for (let i = 1; i <= 39; i++) {
                const regionName = i18n.geographic_regions[String(i)];

                // Skip empty regions
                if (regionName && regionName.trim()) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `${String(i).padStart(2, '0')} - ${regionName}`;
                    filter2SelectElem.appendChild(option);

                }
            }

        } else {

        }
    }
    
    async function applyFilters() {
        // Show spinner
        const applyBtn = document.getElementById('btn-apply-filter');
        const applySpinner = document.getElementById('apply-spinner');
        const loadingSpinner = document.getElementById('loading-spinner');
        
        // Store filter state
        filterCriterion1 = filterCriterion1Select.value;
        filterCriterion2 = filterCriterion2Select.value;
        
        // Validate filter 1
        if (filterCriterion1 !== 'none') {
            if (filterCriterion1 === 'observer') {
                if (!filter1SelectElem.value || filter1SelectElem.value === '') {
                    showWarning(i18n.ui.messages.filter_value_required);
                    return;
                }
            } else if (filterCriterion1 === 'region') {
                if (!filter1SelectElem.value || filter1SelectElem.value === '') {
                    showWarning(i18n.ui.messages.filter_value_required);
                    return;
                }
            }
        }
        
        // Validate filter 2
        if (filterCriterion2 !== 'none') {
            if (filterCriterion2 === 'date' || filterCriterion2 === 'month' || filterCriterion2 === 'year') {
                if (!filter2Value.value.trim()) {
                    showWarning(i18n.ui.messages.filter_value_required);
                    return;
                }
            } else if (filterCriterion2 === 'halo-type') {
                if (!filter2SelectElem.value || filter2SelectElem.value === '') {
                    showWarning(i18n.ui.messages.filter_value_required);
                    return;
                }
            }
        }
        
        applyBtn.disabled = true;
        applySpinner.style.display = 'inline-block';
        
        // Get filter values
        if (filterCriterion1 === 'observer') {
            filterValue1 = parseInt(filter1SelectElem.value) || null;
        } else if (filterCriterion1 === 'region') {
            filterValue1 = parseInt(filter1SelectElem.value) || null;
        } else {
            filterValue1 = null;
        }
        
        if (filterCriterion2 === 'date') {
            // Accept both space-separated (d m y) and dot-separated (d.m.y)
            const parts = filter2Value.value.trim().split(/[\s.]+/);
            if (parts.length === 3) {
                filterValue2 = {
                    t: parseInt(parts[0]),
                    m: parseInt(parts[1]),
                    j: parseInt(parts[2])
                };
            } else {
                filterValue2 = null;
            }
        } else if (filterCriterion2 === 'month') {
            // Accept both space-separated (m y) and dot-separated (m.y)
            const parts = filter2Value.value.trim().split(/[\s.]+/);
            if (parts.length === 2) {
                filterValue2 = {
                    m: parseInt(parts[0]),
                    j: parseInt(parts[1])
                };
            } else {
                filterValue2 = null;
            }
        } else if (filterCriterion2 === 'year') {
            let year = parseInt(filter2Value.value) || null;
            // Keep as 2-digit year to match obs.JJ format in data
            if (year !== null && year >= 100) {
                // Convert 4-digit back to 2-digit (e.g., 1995 -> 95, 2025 -> 25)
                year = year % 100;
            }
            filterValue2 = year;
        } else if (filterCriterion2 === 'halo-type') {
            filterValue2 = parseInt(filter2SelectElem.value) || null;
        } else {
            filterValue2 = null;
        }
        
        // Close the modal properly and wait for it to complete
        const modal = bootstrap.Modal.getInstance(filterDialog);
        if (modal) {
            // Listen for modal hidden event to avoid focus issues
            filterDialog.addEventListener('hidden.bs.modal', function onModalHidden() {
                // Remove listener after it fires once
                filterDialog.removeEventListener('hidden.bs.modal', onModalHidden);
                
                const overlay = showLoadingOverlay(i18n && i18n.ui ? i18n.ui.messages.loading : 'Daten werden geladen...');
                
                // Process filters after modal is fully hidden
                setTimeout(async () => {
                    try {


                        
                        if (window.haloData && window.haloData.isLoaded) {

                            allObservations = window.haloData.observations;
                            await applyFiltersInternal();
                            updateFileInfo(window.haloData.fileName, allObservations.length);
                        } else if (allObservations.length === 0) {

                            await loadObservations();
                        } else {

                            await applyFiltersInternal();
                        }

                    } catch (error) {
                        console.error('Error applying filters:', error);
                    } finally {
                        applySpinner.style.display = 'none';
                        applyBtn.disabled = false;
                        hideLoadingOverlay(overlay);
                    }
                }, 50);
            }, { once: true });
            
            modal.hide();
        } else {
            const overlay = showLoadingOverlay(i18n && i18n.ui ? i18n.ui.messages.loading : 'Daten werden geladen...');
            
            setTimeout(async () => {
                try {
                    if (window.haloData && window.haloData.isLoaded) {
                        allObservations = window.haloData.observations;
                        await applyFiltersInternal();
                        updateFileInfo(window.haloData.fileName, allObservations.length);
                    } else if (allObservations.length === 0) {
                        await loadObservations();
                    } else {
                        await applyFiltersInternal();
                    }
                } catch (error) {
                    console.error('Error applying filters:', error);
                } finally {
                    applySpinner.style.display = 'none';
                    applyBtn.disabled = false;
                    hideLoadingOverlay(overlay);
                }
            }, 50);
        }
    }
    
    // checkelem() function from H_BEOBNG.PAS - checks if observation matches filters
    function checkelem(obs) {
        // First filter (auswahl)
        if (filterCriterion1 === 'observer') {
            if (filterValue1 !== null && obs.KK !== filterValue1) return false;
        } else if (filterCriterion1 === 'region') {
            if (filterValue1 !== null && obs.g !== filterValue1) return false;
        }
        
        // Second filter (auswahl2)
        if (filterCriterion2 === 'date') {
            if (filterValue2 && (obs.TT !== filterValue2.t || obs.MM !== filterValue2.m || obs.JJ !== filterValue2.j)) {
                return false;
            }
        } else if (filterCriterion2 === 'month') {
            if (filterValue2 && (obs.MM !== filterValue2.m || obs.JJ !== filterValue2.j)) {
                return false;
            }
        } else if (filterCriterion2 === 'year') {
            if (filterValue2 !== null && obs.JJ !== filterValue2) return false;
        } else if (filterCriterion2 === 'halo-type') {
            if (filterValue2 !== null && obs.EE !== filterValue2) return false;
        }
        
        return true;
    }
    
    async function applyFiltersInternal() {
        filteredObservations = allObservations.filter(checkelem);
        const obsText = i18n && i18n.ui ? i18n.ui.messages.observations : 'Observations';
        recordCount.textContent = `${filteredObservations.length} ${obsText}`;
        currentPage = 1;
        
        await displayPage();
    }
    
    async function displayPage() {
        // Load displayMode from configuration (Eingabeart setting)
        try {
            const response = await fetch('/api/config/inputmode');
            const config = await response.json();

            displayMode = config.mode === 'M' ? 'lang' : 'kurz';

        } catch (error) {
            console.error('Error loading config:', error);
            displayMode = 'kurz';  // Default to compact on error
        }
        

        if (displayMode === 'kurz') {
            displayCompactView();
        } else {
            displayDetailView();
        }
    }
    
    // Direct 1:1 translation of Kurzausgabe from H_BEOBNG.PAS lines 200-308
    function kurzausgabe(obs) {
        // For web display: Monitor=True, Expo=False, sep1=0, sep2=32 (space)
        // Build the first six 5-char blocks without separators, then insert spaces.
        let first = '';
        const addBlockSpaces = (s) => {
            let out = '';
            for (let i = 0; i < s.length; i += 5) {
                const chunk = s.substring(i, i + 5);
                if (!chunk) break;
                out += chunk;
                if (chunk.length === 5) out += ' ';
            }
            return out;
        };
        
        // KK - observer code
        if (obs.KK < 100) {
            first += String(Math.floor(obs.KK / 10)) + String(obs.KK % 10);
        } else {
            first += String.fromCharCode(Math.floor(obs.KK / 10) + 55) + String(obs.KK % 10);
        }
        
        // O - object type
        first += String(obs.O);
        
        // JJ - year (2 digits)
        first += String(Math.floor(obs.JJ / 10)) + String(obs.JJ % 10);
        
        // MM - month
        first += String(Math.floor(obs.MM / 10)) + String(obs.MM % 10);
        
        // TT - day
        first += String(Math.floor(obs.TT / 10)) + String(obs.TT % 10);
        
        // g - observing site location (0-2)
        first += String(obs.g);
        
        // ZS - time start hour
        if (obs.ZS === null || obs.ZS === -1) {
            first += '//';
        } else {
            first += String(Math.floor(obs.ZS / 10)) + String(obs.ZS % 10);
        }
        
        // ZM - time start minute
        if (obs.ZM === null || obs.ZM === -1) {
            first += '//';
        } else {
            first += String(Math.floor(obs.ZM / 10)) + String(obs.ZM % 10);
        }
        
        // d - origin/density (1 digit)
        if (obs.d === null || obs.d === -1) {
            first += '/';
        } else {
            first += String(obs.d);
        }
        
        // DD - duration (2 digits)
        if (obs.DD === null || obs.DD === -1) {
            first += '//';
        } else {
            first += String(Math.floor(obs.DD / 10)) + String(obs.DD % 10);
        }
        
        // N - cloud cover
        if (obs.N === null || obs.N === -1) {
            first += '/';
        } else {
            first += String(obs.N);
        }
        
        // C - cirrus type
        if (obs.C === null || obs.C === -1) {
            first += '/';
        } else {
            first += String(obs.C);
        }
        
        // c - low clouds
        if (obs.c === null || obs.c === -1) {
            first += '/';
        } else {
            first += String(obs.c);
        }
        
        // EE - halo type (2 digits)
        first += String(Math.floor(obs.EE / 10)) + String(obs.EE % 10);
        
        // H - brightness
        if (obs.H === null || obs.H === -1) {
            first += '/';
        } else {
            first += String(obs.H);
        }
        
        // F - color
        if (obs.F === null || obs.F === -1) {
            first += '/';
        } else {
            first += String(obs.F);
        }
        
        // V - completeness
        if (obs.V === null || obs.V === -1) {
            first += '/';
        } else {
            first += String(obs.V);
        }
        
        // f - weather front (space if -1, not '/')
        if (obs.f === null || obs.f === -1) {
            first += ' ';
        } else {
            first += String(obs.f);
        }
        
        // zz - precipitation
        if (obs.zz === null || obs.zz === -1) {
            first += '  ';
        } else if (obs.zz === 99) {
            first += '//';
        } else {
            first += String(Math.floor(obs.zz / 10)) + String(obs.zz % 10);
        }
        
        // GG - geographic region (1-39)
        first += String(Math.floor(obs.GG / 10)) + String(obs.GG % 10);

        // Now insert spaces after every 5 characters for the first blocks
        let erg = addBlockSpaces(first);
        
        // 8HHHH - light pillar heights (Pascal lines 271-290)
        if (obs.EE === 8) {
            if (obs.HO === null || obs.HO === -1) {
                erg += '8////';
            } else {
                erg += '8' + String(Math.floor(obs.HO / 10)) + String(obs.HO % 10) + '//';
            }
        } else if (obs.EE === 9) {
            if (obs.HU === null || obs.HU === -1) {
                erg += '8////';
            } else {
                erg += '8//' + String(Math.floor(obs.HU / 10)) + String(obs.HU % 10);
            }
        } else if (obs.EE === 10) {
            erg += '8';
            if (obs.HO === null || obs.HO === -1) {
                erg += '//';
            } else {
                erg += String(Math.floor(obs.HO / 10)) + String(obs.HO % 10);
            }
            if (obs.HU === null || obs.HU === -1) {
                erg += '//';
            } else {
                erg += String(Math.floor(obs.HU / 10)) + String(obs.HU % 10);
            }
        } else {
            erg += '/////';
        }
        
        // Separator after 8HHHH block
        erg += ' ';
        
        // Sectors - always exactly 15 chars (pad with spaces if shorter)
        // The sectors field from CSV might have leading/trailing spaces
        let sectors = obs.sectors || '';
        // Trim and then pad to exactly 15 chars
        sectors = sectors.trim().substring(0, 15).padEnd(15, ' ');
        erg += sectors;
        
        // Separator before remarks
        erg += ' ';
        
        // Remarks - rest of line
        if (obs.remarks) {
            erg += obs.remarks.trim();
        }
        
        return erg;
    }
    
    function displayCompactView() {
        compactView.style.display = 'block';
        detailView.style.display = 'none';
        btnExitObservations.style.display = 'block';
        
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredObservations.length);
        const pageData = filteredObservations.slice(startIndex, endIndex);
        const maxPage = Math.ceil(filteredObservations.length / pageSize);
        
        if (pageData.length === 0) {
            compactTbody.textContent = i18n && i18n.ui ? i18n.ui.messages.no_observations : 'No observations found';
            btnExitObservations.style.display = 'block';
            // Hide pagination controls
            btnFirstPage.style.display = 'none';
            btnPrevPage.style.display = 'none';
            btnNextPage.style.display = 'none';
            btnLastPage.style.display = 'none';
            compactPageInfo.textContent = '';
            return;
        }
        
        // Build compact display using kurzausgabe() format
        const lines = pageData.map(obs => kurzausgabe(obs));
        compactTbody.textContent = lines.join('\n');
        
        // Update pagination info
        const pageText = i18n.ui.messages.page;
        const ofText = i18n.ui.messages.of;
        compactPageInfo.textContent = `${pageText} ${currentPage} ${ofText} ${maxPage}`;
        
        // Update button states
        btnFirstPage.disabled = currentPage === 1;
        btnPrevPage.disabled = currentPage === 1;
        btnNextPage.disabled = currentPage === maxPage;
        btnLastPage.disabled = currentPage === maxPage;
        
        // Update record count at bottom
        const rowText = i18n.ui.messages.row;
        pageInfo.textContent = `${rowText} ${startIndex + 1}-${endIndex} ${ofText} ${filteredObservations.length}`;
    }
    
    function displayDetailView() {
        compactView.style.display = 'none';
        detailView.style.display = 'block';
        btnExitObservations.style.display = 'block';
        
        if (filteredObservations.length === 0) {
            const noObs = i18n && i18n.ui ? i18n.ui.messages.no_observations : 'No observations found';
            const ofText = i18n && i18n.ui ? i18n.ui.messages.of : 'of';
            detailContent.textContent = noObs;
            document.getElementById('detail-counter').textContent = `0 ${ofText} 0`;
            return;
        }
        
        currentDetailIndex = (currentPage - 1) * pageSize;
        showDetailRecord();
    }
    
    
    function showDetailRecord() {
        // This fallback display is removed - use showObservationFormForView() instead for modal display
        // See main.js showDisplaySingleObservations() for proper implementation
    }
    
    function navigateDetail(direction) {
        // Navigation is handled by showObservationFormForView() in main.js
    }
    
    async function goToPage(page) {
        const maxPage = Math.ceil(filteredObservations.length / pageSize);
        if (page >= 1 && page <= maxPage) {
            currentPage = page;
            await displayPage();
        }
    }
});
