/**
 * Modular Filter Dialog Component
 * Reusable filter dialog for observations selection
 * Used by: display observations, modify observations, delete observations
 */

class FilterDialog {
    constructor() {
        this.modalElement = null;
        this.modal = null;
        i18nStrings = i18nStrings;
        this.observersData = null;
        
        // Filter state
        this.filterCriterion1 = 'none';
        this.filterValue1 = null;
        this.filterCriterion2 = 'none';
        this.filterValue2 = null;
        
        // Callbacks
        this.onApply = null;
        this.onCancel = null;
    }
    
    async initialize() {
        await this.loadObserversData();
    }
    
    async loadObserversData() {
        try {

            const response = await fetch('/api/observers');

            if (response.ok) {
                const data = await response.json();

                this.observersData = data.observers || [];

                if (this.observersData.length > 0) {

                }
            }
        } catch (error) {
            console.warn('Could not load observers:', error);
        }
    }
    
    /**
     * Show the filter dialog
     * @param {Function} onApplyCallback - Called when filters are applied (filterState) => void
     * @param {Function} onCancelCallback - Called when dialog is cancelled
     */
    async show(onApplyCallback, onCancelCallback) {
        this.onApply = onApplyCallback;
        this.onCancel = onCancelCallback;
        
        // Load fixed observer setting
        let fixedObserver = '';
        try {
            const configResponse = await fetch('/api/config/fixed_observer');
            const config = await configResponse.json();
            fixedObserver = config.observer || '';
        } catch (e) {
            console.error('Error loading fixed observer:', e);
        }
        
        this.createModalHTML();
        this.setupEventListeners();
        this.updateText();
        
        // Apply fixed observer if set
        if (fixedObserver) {
            const filter1Criterion = document.getElementById('filter-criterion-1');
            filter1Criterion.value = 'observer';
            filter1Criterion.disabled = true;
            
            // Trigger change to show observer dropdown
            this.handleFilter1Change();
            
            // Set and disable observer dropdown
            const filter1Select = document.getElementById('filter-1-select');
            filter1Select.value = fixedObserver;
            filter1Select.disabled = true;
        }
        
        this.modal = new bootstrap.Modal(this.modalElement);
        this.modal.show();
    }
    
    createModalHTML() {
        // Remove existing modal if any
        const existing = document.getElementById('filter-dialog');
        if (existing) {
            existing.remove();
        }
        
        const modalHtml = `
            <div class="modal fade" id="filter-dialog" tabindex="-1" aria-labelledby="filterDialogLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="filterDialogLabel">Auswahlkriterien</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="filter-form">
                                <div class="filter-group mb-3">
                                    <label class="form-label">1. Wonach soll die Beobachtung ausgewählt werden?</label>
                                    <select id="filter-criterion-1" class="form-select">
                                        <option value="none">kein Kriterium</option>
                                        <option value="observer">Beobachter</option>
                                        <option value="region">Beobachtungsgebiet</option>
                                    </select>
                                    <div id="filter-1-input" style="display:none;" class="mt-2">
                                        <select id="filter-1-select" class="form-select"></select>
                                    </div>
                                </div>
                                <div class="filter-group">
                                    <label class="form-label">2. Geben Sie ein weiteres Auswahlkriterium ein</label>
                                    <select id="filter-criterion-2" class="form-select">
                                        <option value="none">kein Kriterium</option>
                                        <option value="date">Datum</option>
                                        <option value="month">Monat</option>
                                        <option value="year">Jahr</option>
                                        <option value="halo-type">Haloart</option>
                                    </select>
                                    <div id="filter-2-input" style="display:none;" class="mt-2">
                                        <input type="text" id="filter-2-value" class="form-control" placeholder="">
                                        <select id="filter-2-select" class="form-select" style="display:none;"></select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer py-2">
                            <button type="button" id="btn-cancel-filter" class="btn btn-secondary btn-sm px-3">${i18nStrings.common.cancel}</button>
                            <button type="button" id="btn-apply-filter" class="btn btn-primary btn-sm px-3">
                                <span id="apply-spinner" class="spinner-border spinner-border-sm me-1" role="status" style="display:none;"></span>
                                ${i18nStrings.common.ok}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modalElement = document.getElementById('filter-dialog');
    }
    
    setupEventListeners() {
        const filterCriterion1Select = document.getElementById('filter-criterion-1');
        const filterCriterion2Select = document.getElementById('filter-criterion-2');
        const filter2Value = document.getElementById('filter-2-value');
        const btnApply = document.getElementById('btn-apply-filter');
        const btnCancel = document.getElementById('btn-cancel-filter');
        
        filterCriterion1Select.addEventListener('change', () => this.handleFilter1Change());
        filterCriterion2Select.addEventListener('change', () => this.handleFilter2Change());
        
        if (filter2Value) {
            filter2Value.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyFilters();
                }
            });
        }
        
        // Bind Enter key to Apply button for entire modal
        this.modalElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnApply.click();
            }
        });
        
        btnApply.addEventListener('click', () => this.applyFilters());
        btnCancel.addEventListener('click', () => {
            this.modal.hide();
            if (this.onCancel) this.onCancel();
        });
        
        // Clean up on modal hidden
        this.modalElement.addEventListener('hidden.bs.modal', () => {
            this.modalElement.remove();
        });
    }
    
    updateText() {
        if (!i18nStrings || !i18nStrings.ui) return;
        
        const ui = i18nStrings.ui;
        
        document.getElementById('filterDialogLabel').textContent = ui.filter_dialog.title;
        
        const filter1Label = document.querySelector('#filter-criterion-1').previousElementSibling;
        if (filter1Label) filter1Label.textContent = '1. ' + ui.filter_dialog.question_1;
        
        const filter1Select = document.getElementById('filter-criterion-1');
        filter1Select.options[0].textContent = ui.filter_dialog.no_criterion;
        filter1Select.options[1].textContent = ui.filter_dialog.observer_name || ui.filter_dialog.observer_code;
        filter1Select.options[2].textContent = ui.filter_dialog.region;
        
        const filter2Label = document.querySelector('#filter-criterion-2').previousElementSibling;
        if (filter2Label) filter2Label.textContent = '2. ' + ui.filter_dialog.question_2;
        
        const filter2Select = document.getElementById('filter-criterion-2');
        filter2Select.options[0].textContent = ui.filter_dialog.no_criterion;
        filter2Select.options[1].textContent = ui.filter_dialog.date;
        filter2Select.options[2].textContent = ui.filter_dialog.month;
        filter2Select.options[3].textContent = ui.filter_dialog.year;
        filter2Select.options[4].textContent = ui.filter_dialog.halo_type;
        
        document.getElementById('btn-cancel-filter').textContent = i18nStrings.common.cancel;
        const applyBtn = document.getElementById('btn-apply-filter');
        applyBtn.childNodes[applyBtn.childNodes.length - 1].textContent = i18nStrings.common.ok;
    }
    
    handleFilter1Change() {
        const value = document.getElementById('filter-criterion-1').value;
        const filter1Input = document.getElementById('filter-1-input');
        const filter1SelectElem = document.getElementById('filter-1-select');
        
        if (value === 'none') {
            filter1Input.style.display = 'none';
        } else if (value === 'observer') {
            filter1Input.style.display = 'block';
            filter1SelectElem.style.display = 'block';
            this.populateObserverSelect();
            setTimeout(() => filter1SelectElem.focus(), 50);
        } else if (value === 'region') {
            filter1Input.style.display = 'block';
            filter1SelectElem.style.display = 'block';
            this.populateRegionSelectForFilter1();
            setTimeout(() => filter1SelectElem.focus(), 50);
        }
    }
    
    handleFilter2Change() {
        const value = document.getElementById('filter-criterion-2').value;
        const filter2Input = document.getElementById('filter-2-input');
        const filter2Value = document.getElementById('filter-2-value');
        const filter2SelectElem = document.getElementById('filter-2-select');
        
        if (value === 'none') {
            filter2Input.style.display = 'none';
        } else if (value === 'date') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'block';
            filter2SelectElem.style.display = 'none';
            filter2Value.placeholder = i18nStrings && i18nStrings.ui ? i18nStrings.ui.placeholders.date : '';
            setTimeout(() => filter2Value.focus(), 50);
        } else if (value === 'month') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'block';
            filter2SelectElem.style.display = 'none';
            filter2Value.placeholder = i18nStrings && i18nStrings.ui ? i18nStrings.ui.placeholders.month : '';
            setTimeout(() => filter2Value.focus(), 50);
        } else if (value === 'year') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'block';
            filter2SelectElem.style.display = 'none';
            filter2Value.placeholder = i18nStrings && i18nStrings.ui ? i18nStrings.ui.placeholders.year : '';
            setTimeout(() => filter2Value.focus(), 50);
        } else if (value === 'halo-type') {
            filter2Input.style.display = 'block';
            filter2Value.style.display = 'none';
            filter2SelectElem.style.display = 'block';
            this.populateHaloTypeSelect();
            setTimeout(() => filter2SelectElem.focus(), 50);
        }
    }
    
    populateObserverSelect() {
        const filter1SelectElem = document.getElementById('filter-1-select');
        filter1SelectElem.innerHTML = '';
        
        let observers = [];
        
        if (this.observersData && Array.isArray(this.observersData)) {

            observers = this.observersData.map(obs => {

                return {
                    kk: parseInt(obs.KK || obs.kk),
                    name: `${obs.VName || ''} ${obs.NName || ''}`.trim()
                };
            }).sort((a,b) => a.kk - b.kk);
        } else if (window.haloData && window.haloData.observers) {

            observers = window.haloData.observers.map(obs => ({
                kk: parseInt(obs.KK || obs.kk),
                name: `${obs.VName || ''} ${obs.NName || ''}`.trim()
            })).sort((a,b) => a.kk - b.kk);
        } else {

        }
        
        observers.forEach(obs => {
            const option = document.createElement('option');
            option.value = obs.kk;
            option.textContent = `${String(obs.kk).padStart(2, '0')} - ${obs.name}`;
            filter1SelectElem.appendChild(option);
        });
    }
    
    populateRegionSelectForFilter1() {
        const filter1SelectElem = document.getElementById('filter-1-select');
        filter1SelectElem.innerHTML = '';
        
        if (i18nStrings && i18nStrings.geographic_regions) {
            for (let i = 1; i <= 39; i++) {
                const regionName = i18nStrings.geographic_regions[String(i)];
                if (regionName && regionName.trim()) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `${String(i).padStart(2, '0')} - ${regionName}`;
                    filter1SelectElem.appendChild(option);
                }
            }
        }
    }
    
    populateHaloTypeSelect() {
        const filter2SelectElem = document.getElementById('filter-2-select');
        const unknown = i18nStrings && i18nStrings.ui ? i18nStrings.ui.filter_dialog.unknown : 'Unknown';
        filter2SelectElem.innerHTML = '';
        
        if (i18nStrings && i18nStrings.halo_types) {
            for (let i = 1; i <= 99; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${String(i).padStart(2, '0')} - ${i18nStrings.halo_types[i] || unknown}`;
                filter2SelectElem.appendChild(option);
            }
        }
    }
    
    applyFilters() {
        const filterCriterion1Select = document.getElementById('filter-criterion-1');
        const filterCriterion2Select = document.getElementById('filter-criterion-2');
        const filter1SelectElem = document.getElementById('filter-1-select');
        const filter2Value = document.getElementById('filter-2-value');
        const filter2SelectElem = document.getElementById('filter-2-select');
        
        this.filterCriterion1 = filterCriterion1Select.value;
        this.filterCriterion2 = filterCriterion2Select.value;
        
        // Validate filter 1
        if (this.filterCriterion1 !== 'none') {
            if (!filter1SelectElem.value || filter1SelectElem.value === '') {
                this.showWarning(i18nStrings && i18nStrings.ui ? i18nStrings.ui.messages.filter_value_required : 'Bitte geben Sie einen Filterwert ein!');
                return;
            }
        }
        
        // Validate filter 2
        if (this.filterCriterion2 !== 'none') {
            if (this.filterCriterion2 === 'date' || this.filterCriterion2 === 'month' || this.filterCriterion2 === 'year') {
                if (!filter2Value.value.trim()) {
                    this.showWarning(i18nStrings && i18nStrings.ui ? i18nStrings.ui.messages.filter_value_required : 'Bitte geben Sie einen Filterwert ein!');
                    return;
                }
            } else if (this.filterCriterion2 === 'halo-type') {
                if (!filter2SelectElem.value || filter2SelectElem.value === '') {
                    this.showWarning(i18nStrings && i18nStrings.ui ? i18nStrings.ui.messages.filter_value_required : 'Bitte geben Sie einen Filterwert ein!');
                    return;
                }
            }
        }
        
        // Get filter values
        if (this.filterCriterion1 === 'observer') {
            this.filterValue1 = parseInt(filter1SelectElem.value) || null;
        } else if (this.filterCriterion1 === 'region') {
            this.filterValue1 = parseInt(filter1SelectElem.value) || null;
        } else {
            this.filterValue1 = null;
        }
        
        if (this.filterCriterion2 === 'date') {
            const parts = filter2Value.value.trim().split(/[\s.]+/);
            if (parts.length === 3) {
                this.filterValue2 = {
                    t: parseInt(parts[0]),
                    m: parseInt(parts[1]),
                    j: parseInt(parts[2])
                };
            } else {
                this.filterValue2 = null;
            }
        } else if (this.filterCriterion2 === 'month') {
            const parts = filter2Value.value.trim().split(/[\s.]+/);
            if (parts.length === 2) {
                this.filterValue2 = {
                    m: parseInt(parts[0]),
                    j: parseInt(parts[1])
                };
            } else {
                this.filterValue2 = null;
            }
        } else if (this.filterCriterion2 === 'year') {
            let year = parseInt(filter2Value.value) || null;
            if (year !== null && year >= 100) {
                year = year % 100;
            }
            this.filterValue2 = year;
        } else if (this.filterCriterion2 === 'halo-type') {
            this.filterValue2 = parseInt(filter2SelectElem.value) || null;
        } else {
            this.filterValue2 = null;
        }
        
        // Hide modal and call callback
        this.modal.hide();
        
        if (this.onApply) {
            this.onApply({
                criterion1: this.filterCriterion1,
                value1: this.filterValue1,
                criterion2: this.filterCriterion2,
                value2: this.filterValue2
            });
        }
    }
    
    showWarning(message) {
        showNotification(message, 'warning', 5000);
    }
}

// Make it globally available
window.FilterDialog = FilterDialog;
