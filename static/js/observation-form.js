/**
 * Modular Observation Form Component (Menüeingabe)
 * Reusable observation form for add and modify operations
 */

class ObservationForm {
    constructor() {
        this.modalElement = null;
        this.modal = null;
        this.observers = [];
        this.fixedObserver = '';
        this.fields = {};
        this.onSave = null;
        this.onCancel = null;
        this.mode = 'add'; // 'add' or 'edit'
        this.originalObservation = null;
        this.saved = false;
        this.skipped = false;
    }
    
    async initialize(mode = 'add') {
        await this.loadObservers();
        await this.loadFixedObserver();
        // Only load dateDefault for 'add' mode (not needed for edit/delete/view)
        if (mode === 'add') {
            await this.loadDateDefault();
        }
    }
    
    async loadObservers() {
        try {
            const data = await loadObserverCodes();
            this.observers = data.observers;
        } catch (e) {
            console.error('Error loading observers:', e);
        }
    }
    
    async loadFixedObserver() {
        try {
            const response = await fetch('/api/config/fixed_observer');
            const config = await response.json();
            this.fixedObserver = config.observer || '';
        } catch (e) {
            // Silently ignore - error can occur when multiple forms are created rapidly
            // This is not a critical error, just means fixed observer won't be enforced
        }
    }
    
    async loadDateDefault() {
        try {
            // Use the helper function from main.js
            const dateDefault = await getDateDefault();
            if (dateDefault) {
                this.dateDefault = dateDefault;
            }
        } catch (e) {
            // Silently ignore - dateDefault only needed for 'add' mode
            // Error can occur when previous modal is still cleaning up
        }
    }
    
    /**
     * Show the observation form
     * @param {string} mode - 'add', 'edit', 'delete', or 'view'
     * @param {object|null} observation - Existing observation data for edit/delete/view mode
     * @param {function} onSaveCallback - Called when observation is saved (add/edit) or null for delete/view
     * @param {function} onCancelCallback - Called when form is cancelled/skipped or null for delete/view
     * @param {number} currentNum - Current observation number (for edit/delete/view mode)
     * @param {number} totalNum - Total observations (for edit/delete/view mode)
     * @param {string} customTitle - Custom title for delete mode
     * @param {function} onYes - Called when Yes is clicked (delete mode) or Next (view mode)
     * @param {function} onNo - Called when No is clicked (delete mode) or Previous (view mode)
     * @param {function} onCancelBtn - Called when Cancel is clicked (delete/view mode)
     */
    show(mode, observation, onSaveCallback, onCancelCallback, currentNum = null, totalNum = null, customTitle = null, onYes = null, onNo = null, onCancelBtn = null) {
        this.mode = mode;
        this.originalObservation = observation;
        this.onSave = onSaveCallback;
        this.onCancel = onCancelCallback;
        this.currentNum = currentNum;
        this.totalNum = totalNum;
        this.customTitle = customTitle;
        this.onYes = onYes;
        this.onNo = onNo;
        this.onCancelBtn = onCancelBtn;
        this.isEditingMode = false; // Track if user has entered editing mode
        this.navigating = false; // Track if user is navigating (Next/Prev in view mode)
        this.noButtonPressed = false; // Track if No button was pressed (prevents cancel callback)
        this.noButtonPressed = false; // Track if No button was pressed (prevents cancel callback)
        this.noButtonPressed = false; // Track if No button was pressed (delete mode)
        
        this.createModalHTML();
        this.setupEventListeners();
        
        if ((mode === 'edit' || mode === 'delete' || mode === 'view') && observation) {
            this.populateFields(observation);
            // Disable all fields in edit/delete/view mode - user must click "Yes" to edit
            setTimeout(() => {
                this.disableAllFields();
            }, 0);
        } else if (mode === 'add' && this.dateDefault) {
            // Pre-fill date fields for new observations
            setTimeout(() => {
                if (this.fields.mm) {
                    this.fields.mm.value = this.dateDefault.mm;
                }
                if (this.fields.jj) {
                    this.fields.jj.value = this.dateDefault.jj;
                }
            }, 0);
        }
        
        this.modal = new bootstrap.Modal(this.modalElement);
        this.modal.show();
    }
    
    createModalHTML() {
        // Remove existing modal if any
        const existing = document.getElementById('observation-form-modal');
        if (existing) {
            existing.remove();
        }
        
        let title;
        if (this.customTitle) {
            title = this.customTitle;
        } else if (this.mode === 'edit') {
            title = i18nStrings.observations.modify_observation;
        } else if (this.mode === 'delete') {
            title = i18nStrings.observations.delete_question;
        } else if (this.mode === 'view') {
            title = i18nStrings.observations.display;
        } else {
            title = i18nStrings.observations.add_observation;
        }
        
        const titleWithCounter = (this.mode === 'edit' || this.mode === 'delete' || this.mode === 'view') && this.currentNum && this.totalNum
            ? `${title} (${this.currentNum}/${this.totalNum})`
            : title;
        
        // Build observer options
        const observerOptions = this.observers.map(obs => {
            const selected = obs.KK === this.fixedObserver ? 'selected' : '';
            return `<option value="${obs.KK}" ${selected}>${obs.KK} - ${obs.VName || ''} ${obs.NName || ''}</option>`;
        }).join('');
        
        // Build year options (1950-2049)
        const yearOptions = Array.from({length: 100}, (_, i) => {
            const year = 50 + i;
            const displayYear = year < 50 ? 2000 + year : 1900 + year;
            return `<option value="${year}">${displayYear}</option>`;
        }).join('');
        
        const modalHtml = `
            <div class="modal fade" id="observation-form-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header py-1">
                            <h6 class="modal-title">${titleWithCounter}</h6>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body py-2">
                            <div class="row g-2">
                                ${this.buildFormFields(observerOptions, yearOptions)}
                            </div>
                            <div class="alert alert-danger mt-2" id="obs-form-error" style="display:none;"></div>
                        </div>
                        <div class="modal-footer py-1">
                            ${this.mode === 'view' ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-obs-form-prev" ${this.currentNum === 1 ? 'disabled' : ''}>${i18nStrings.common.previous}</button>` : ''}
                            ${this.mode === 'view' ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-obs-form-next" ${this.currentNum === this.totalNum ? 'disabled' : ''}>${i18nStrings.common.next}</button>` : ''}
                            ${this.mode === 'view' ? `<button type="button" class="btn btn-primary btn-sm" id="btn-obs-form-ok-view">${i18nStrings.common.ok}</button>` : ''}
                            ${this.mode !== 'view' ? `<button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${i18nStrings.common.cancel}</button>` : ''}
                            ${(this.mode === 'edit' || this.mode === 'delete') ? `<button type="button" class="btn btn-outline-primary btn-sm" id="btn-obs-form-no">${i18nStrings.common.no}</button>` : ''}
                            ${(this.mode === 'edit' || this.mode === 'delete') ? `<button type="button" class="btn btn-primary btn-sm" id="btn-obs-form-yes">${i18nStrings.common.yes}</button>` : ''}
                            ${this.mode === 'add' ? `<button type="button" class="btn btn-primary btn-sm" id="btn-obs-form-ok" disabled>${i18nStrings.common.ok}</button>` : ''}
                            ${(this.mode === 'edit' || this.mode === 'delete') ? `<button type="button" class="btn btn-primary btn-sm" id="btn-obs-form-ok" style="display:none;">${i18nStrings.common.ok}</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modalElement = document.getElementById('observation-form-modal');
    }
    
    buildFormFields(observerOptions, yearOptions) {
        const kkDisabled = this.fixedObserver ? 'disabled' : '';
        return `
            <div class="col-md-6">
                <label class="form-label">KK - ${i18nStrings.fields.observer} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-kk" ${kkDisabled} required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    ${observerOptions}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label">O - ${i18nStrings.fields.object} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-o" required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    <option value="1">1 - ${i18nStrings.object_types.['1']}</option>
                    <option value="2">2 - ${i18nStrings.object_types.['2']}</option>
                    <option value="3">3 - ${i18nStrings.object_types.['3']}</option>
                    <option value="4">4 - ${i18nStrings.object_types.['4']}</option>
                    <option value="5">5 - ${i18nStrings.object_types.['5']}</option>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">JJ - ${i18nStrings.fields.year} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-jj" required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    ${yearOptions}
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">MM - ${i18nStrings.fields.month} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-mm" required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    ${Array.from({length: 12}, (_, i) => {
                        const monthNum = i + 1;
                        const monthName = i18nStrings.months[monthNum];
                        return `<option value="${monthNum}">${String(monthNum).padStart(2, '0')} - ${monthName}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">TT - ${i18nStrings.fields.day} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-tt" required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    ${Array.from({length: 31}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">g - ${i18nStrings.fields.observing_area } <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-g" required>
                    <option value="">-- ${i18nStrings.fields.select } --</option>
                    <option value="0">0 - ${i18nStrings.location_types.['0']}</option>
                    <option value="1">1 - ${i18nStrings.location_types.['1']}</option>
                    <option value="2">2 - ${i18nStrings.location_types.['2']}</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">ZS - ${i18nStrings.fields.hour}</label>
                <select class="form-select form-select-sm" id="form-zs">
                    <option value="">--</option>
                    ${Array.from({length: 24}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">ZM - ${i18nStrings.fields.minute}</label>
                <select class="form-select form-select-sm" id="form-zm">
                    <option value="">--</option>
                    ${Array.from({length: 60}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">d - ${i18nStrings.fields.cirrus_density}</label>
                <select class="form-select form-select-sm" id="form-d">
                    <option value="-1">-- ${i18nStrings.fields.not_specified} --</option>
                    <option value="0">0 - ${i18nStrings.cirrus_density.['0']}</option>
                    <option value="1">1 - ${i18nStrings.cirrus_density.['1'] }</option>
                    <option value="2">2 - ${i18nStrings.cirrus_density.['2']}</option>
                    <option value="4">4 - ${i18nStrings.cirrus_density.['4']}</option>
                    <option value="5">5 - ${i18nStrings.cirrus_density.['5']}</option>
                    <option value="6">6 - ${i18nStrings.cirrus_density.['6']}</option>
                    <option value="7">7 - ${i18nStrings.cirrus_density.['7']}</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">DD - ${i18nStrings.fields.duration}</label>
                <select class="form-select form-select-sm" id="form-dd">
                    <option value="-1">--</option>
                    ${Array.from({length: 100}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">N - ${i18nStrings.fields.cloud_cover}</label>
                <select class="form-select form-select-sm" id="form-n">
                    <option value="-1">--</option>
                    ${Array.from({length: 10}, (_, i) => {
                        const label = i18nStrings.cloud_cover.[i.toString()] || `${i}/8`;
                        return `<option value="${i}">${i} - ${label}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">C - ${i18nStrings.fields.cirrus_type}</label>
                <select class="form-select form-select-sm" id="form-C">
                    <option value="-1">--</option>
                    ${Array.from({length: 8}, (_, i) => {
                        const label = i18nStrings.cirrus_types.[i.toString()] || i.toString();
                        return `<option value="${i}">${i} - ${label}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">c - ${i18nStrings.fields.low_clouds}</label>
                <select class="form-select form-select-sm" id="form-c">
                    <option value="-1">--</option>
                    ${Array.from({length: 10}, (_, i) => {
                        const label = i18nStrings.low_clouds.[i.toString()] || i.toString();
                        return `<option value="${i}">${i} - ${label}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">EE - ${i18nStrings.fields.phenomenon} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-ee" required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    ${this.buildHaloTypeOptions()}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">H - ${i18nStrings.fields.brightness}</label>
                <select class="form-select form-select-sm" id="form-h">
                    <option value="-1">--</option>
                    ${Array.from({length: 4}, (_, i) => {
                        const label = i18nStrings.brightness.[i.toString()] || i.toString();
                        return `<option value="${i}">${i} - ${label}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">F - ${i18nStrings.fields.color}</label>
                <select class="form-select form-select-sm" id="form-F">
                    <option value="-1">--</option>
                    ${Array.from({length: 6}, (_, i) => {
                        const label = i18nStrings.color.[i.toString()] || i.toString();
                        return `<option value="${i}">${i} - ${label}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">V - ${i18nStrings.fields.completeness}</label>
                <select class="form-select form-select-sm" id="form-v">
                    <option value="-1">--</option>
                    <option value="1">1 - ${i18nStrings.completeness.['1']}</option>
                    <option value="2">2 - ${i18nStrings.completeness.['2']}</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">f - ${i18nStrings.fields.weather_front}</label>
                <select class="form-select form-select-sm" id="form-weather_front">
                    <option value="-1">--</option>
                    ${Array.from({length: 9}, (_, i) => {
                        const label = i18nStrings.weather_front.[i.toString()] || i.toString();
                        return `<option value="${i}">${i} - ${label}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">zz - ${i18nStrings.fields.precipitation}</label>
                <select class="form-select form-select-sm" id="form-zz">
                    <option value="-1">--</option>
                    ${Array.from({length: 99}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
                    <option value="99">99</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">GG - ${i18nStrings.fields.region} <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="form-gg" required>
                    <option value="">-- ${i18nStrings.fields.select} --</option>
                    ${this.buildRegionOptions()}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label">8HHHH</label>
                <div class="row g-1">
                    <div class="col-6">
                        <label class="form-label small">HO (ober)</label>
                        <select class="form-select form-select-sm" id="form-ho">
                            <option value="-1">--</option>
                            ${Array.from({length: 90}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}°</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="form-label small">HU (unter)</label>
                        <select class="form-select form-select-sm" id="form-hu">
                            <option value="-1">--</option>
                            ${Array.from({length: 90}, (_, i) => `<option value="${i+1}">${String(i+1).padStart(2, '0')}°</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <div class="col-12">
                <label class="form-label">${i18nStrings.fields.sectors}</label>
                <input type="text" class="form-control form-control-sm" id="form-sectors" maxlength="15">
            </div>
            <div class="col-12">
                <label class="form-label">${i18nStrings.fields.remarks}</label>
                <input type="text" class="form-control form-control-sm" id="form-remarks" maxlength="60">
            </div>
        `;
    }
    
    buildHaloTypeOptions() {
        let html = '';
        for (let i = 1; i <= 77; i++) {
            const label = i18nStrings.halo_types[i.toString()];
            html += `<option value="${i}">${String(i).padStart(2, '0')} - ${label}</option>`;
        }
        html += `<option value="99">99 - ${i18nStrings.halo_types['99']}</option>`;
        return html;
    }
    
    buildRegionOptions() {
        const regions = [1,2,3,4,5,6,7,8,9,10,11,16,17,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39];
        return regions.map(gg => {
            const label = i18nStrings.geographic_regions[gg.toString()];
            return `<option value="${gg}">${String(gg).padStart(2, '0')} - ${label}</option>`;
        }).join('');
    }
    
    setupEventListeners() {
        // Get all field references
        this.fields = {
            kk: document.getElementById('form-kk'),
            o: document.getElementById('form-o'),
            jj: document.getElementById('form-jj'),
            mm: document.getElementById('form-mm'),
            tt: document.getElementById('form-tt'),
            g: document.getElementById('form-g'),
            zs: document.getElementById('form-zs'),
            zm: document.getElementById('form-zm'),
            d: document.getElementById('form-d'),
            dd: document.getElementById('form-dd'),
            n: document.getElementById('form-n'),
            C: document.getElementById('form-C'),
            c: document.getElementById('form-c'),
            ee: document.getElementById('form-ee'),
            h: document.getElementById('form-h'),
            F: document.getElementById('form-F'),
            v: document.getElementById('form-v'),
            f: document.getElementById('form-weather_front'),
            zz: document.getElementById('form-zz'),
            gg: document.getElementById('form-gg'),
            ho: document.getElementById('form-ho'),
            hu: document.getElementById('form-hu'),
            sectors: document.getElementById('form-sectors'),
            remarks: document.getElementById('form-remarks')
        };
        
        const errEl = document.getElementById('obs-form-error');
        const okBtn = document.getElementById('btn-obs-form-ok');
        
        // Check required fields
        const checkRequired = () => {
            const required = ['kk', 'o', 'jj', 'mm', 'tt', 'g', 'ee', 'gg'];
            const allFilled = required.every(key => this.fields[key].value !== '');
            if (okBtn) {
                okBtn.disabled = !allFilled;
            }
        };
        
        // Auto-fill GG based on g, kk, jj, mm
        const autoFillGG = async () => {
            const g = parseInt(this.fields.g.value);
            if (g === 0 || g === 2) {
                const kk = this.fields.kk.value;
                const jj = parseInt(this.fields.jj.value) % 100;
                const mm = this.fields.mm.value;
                if (kk && jj && mm) {
                    try {
                        const resp = await fetch(`/api/observers?kk=${kk}&jj=${jj}&mm=${mm}`);
                        if (resp.ok) {
                            const data = await resp.json();
                            if (data.observer) {
                                const gg = g === 0 ? data.observer.GH : data.observer.GN;
                                this.fields.gg.value = gg;
                                this.fields.gg.disabled = true;
                                checkRequired();
                            }
                        }
                    } catch (e) {
                        console.error('Error fetching GG:', e);
                    }
                }
            } else {
                this.fields.gg.disabled = false;
                if (!this.originalObservation) {
                    this.fields.gg.value = '';
                }
            }
            checkRequired();
        };
        
        this.fields.g.addEventListener('change', autoFillGG);
        this.fields.kk.addEventListener('change', autoFillGG);
        this.fields.jj.addEventListener('change', autoFillGG);
        this.fields.mm.addEventListener('change', autoFillGG);
        
        // Auto-manage 8HHHH fields based on EE
        this.fields.ee.addEventListener('change', () => {
            const ee = parseInt(this.fields.ee.value);
            if (ee && ![8, 9, 10].includes(ee)) {
                this.fields.ho.value = '-1';
                this.fields.hu.value = '-1';
                this.fields.ho.disabled = true;
                this.fields.hu.disabled = true;
            } else {
                this.fields.ho.disabled = false;
                this.fields.hu.disabled = false;
                if (ee === 8) {
                    this.fields.ho.disabled = false;
                    this.fields.hu.value = '-1';
                    this.fields.hu.disabled = true;
                } else if (ee === 9) {
                    this.fields.ho.value = '-1';
                    this.fields.ho.disabled = true;
                    this.fields.hu.disabled = false;
                } else if (ee === 10) {
                    this.fields.ho.disabled = false;
                    this.fields.hu.disabled = false;
                }
            }
        });
        
        // Auto-manage sectors based on EE and V
        const checkSectorsAutoFill = () => {
            const ee = parseInt(this.fields.ee.value);
            const v = parseInt(this.fields.v.value);
            const circularHalos = [1, 7, 12, 31, 32, 33, 34, 35, 36, 40];
            
            if (ee && circularHalos.includes(ee)) {
                if (v === 1) {
                    this.fields.sectors.disabled = false;
                } else if (v === 2) {
                    this.fields.sectors.value = '';
                    this.fields.sectors.disabled = true;
                } else {
                    this.fields.sectors.disabled = false;
                }
            } else {
                this.fields.sectors.value = '';
                this.fields.sectors.disabled = true;
            }
        };
        
        this.fields.ee.addEventListener('change', checkSectorsAutoFill);
        this.fields.v.addEventListener('change', checkSectorsAutoFill);
        
        // Required field listeners
        ['kk', 'o', 'jj', 'mm', 'tt', 'g', 'ee', 'gg'].forEach(key => {
            this.fields[key].addEventListener('change', checkRequired);
        });
        
        // Yes button handler - enable editing (edit mode) or trigger delete (delete mode)
        const yesBtn = document.getElementById('btn-obs-form-yes');
        if (yesBtn) {
            yesBtn.addEventListener('click', async () => {
                if (this.mode === 'delete') {
                    // In delete mode, Yes means confirm deletion
                    // Don't hide modal yet - let the callback handle it after async operation
                    if (this.onYes) {
                        await this.onYes();
                    }
                    this.modal.hide();
                } else {
                    // In edit mode, Yes means enable editing
                    this.isEditingMode = true;
                    this.enableAllFields();
                    
                    // Hide Yes/No buttons, show OK button
                    yesBtn.style.display = 'none';
                    const noBtn = document.getElementById('btn-obs-form-no');
                    if (noBtn) noBtn.style.display = 'none';
                    
                    if (okBtn) {
                        okBtn.style.display = 'block';
                        okBtn.textContent = i18nStrings.common.ok;
                        okBtn.className = 'btn btn-primary btn-sm';
                        checkRequired();
                    }
                }
            });
        }
        
        // No button handler - skip this observation (both edit and delete modes)
        const noBtn = document.getElementById('btn-obs-form-no');
        if (noBtn) {
            noBtn.addEventListener('click', () => {
                if (this.mode === 'delete') {
                    // In delete mode, No means skip to next
                    this.noButtonPressed = true; // Prevent cancel callback
                    this.modal.hide();
                    if (this.onNo) {
                        this.onNo();
                    }
                } else {
                    // In edit mode, No means skip this observation
                    this.skipped = true;
                    this.modal.hide();
                    if (this.onCancel) {
                        this.onCancel();
                    }
                }
            });
            
            // Bind Enter key to No button when in view mode (default action)
            this.modalElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.isEditingMode) {
                    e.preventDefault();
                    noBtn.click();
                }
            });
        }
        
        // View mode navigation buttons
        const nextBtn = document.getElementById('btn-obs-form-next');
        const prevBtn = document.getElementById('btn-obs-form-prev');
        const okViewBtn = document.getElementById('btn-obs-form-ok-view');
        
        if (nextBtn && this.mode === 'view') {
            nextBtn.addEventListener('click', () => {
                this.navigating = true;
                this.modal.hide();
                if (this.onYes) {
                    this.onYes(); // Next
                }
            });
            
            // Bind Enter key to Next button in view mode
            this.modalElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    nextBtn.click();
                }
            });
        }
        
        // OK button in view mode should close and return to main (like ESC/Cancel)
        if (okViewBtn && this.mode === 'view') {
            okViewBtn.addEventListener('click', () => {
                this.modal.hide();
                // Don't set navigating - let the hidden handler call onCancelBtn
            });
        }
        
        if (prevBtn && this.mode === 'view') {
            prevBtn.addEventListener('click', () => {
                this.navigating = true;
                this.modal.hide();
                if (this.onNo) {
                    this.onNo(); // Previous
                }
            });
        }
        
        // OK button handler (only exists in add mode initially)
        if (okBtn) {
            okBtn.addEventListener('click', async () => {
                try {
                    const obs = this.getFormData();
                    
                    if (this.onSave) {
                        await this.onSave(obs);
                    }
                    
                    // Sync haloData to sessionStorage after save
                    if (window.saveHaloDataToSession) {
                        window.saveHaloDataToSession();
                    }
                    
                    this.saved = true;
                    this.modal.hide();
                } catch (e) {
                    errEl.textContent = e.message;
                    errEl.style.display = 'block';
                }
            });
        }
        
        // Clean up on modal hidden
        this.modalElement.addEventListener('hidden.bs.modal', () => {
            if (!this.saved && !this.skipped && !this.navigating && !this.noButtonPressed) {
                // User cancelled (ESC or Cancel button)
                if (this.mode === 'delete' && this.onCancelBtn) {
                    // Delete mode with custom cancel handler
                    this.onCancelBtn();
                } else if (this.mode === 'view' && this.onCancelBtn) {
                    // View mode with custom cancel handler
                    this.onCancelBtn();
                } else {
                    // Edit/Add mode - return to main page
                    // But preserve file state in sessionStorage first
                    if (window.haloData && window.haloData.isLoaded) {
                        // Reset isDirty since user didn't save any changes in the form
                        window.haloData.isDirty = false;
                        sessionStorage.setItem('haloData', JSON.stringify(window.haloData));
                    }
                    window.location.href = '/';
                }
            }
            this.modalElement.remove();
        });
    }
    
    disableAllFields() {
        Object.values(this.fields).forEach(field => {
            if (field) field.disabled = true;
        });
    }
    
    enableAllFields() {
        Object.values(this.fields).forEach(field => {
            if (field && field.id !== 'form-gg' && field.id !== 'form-kk') {
                // Don't enable KK if fixed observer is set
                field.disabled = false;
            }
        });
        
        // Only enable KK if no fixed observer
        if (this.fields.kk && !this.fixedObserver) {
            this.fields.kk.disabled = false;
        }
        
        // GG field auto-filled based on g value
        const g = parseInt(this.fields.g.value);

        if (g !== 0 && g !== 2) {
            this.fields.gg.disabled = false;
        }
    }
    
    populateFields(obs) {
        // Populate all fields with observation data
        this.fields.kk.value = obs.KK || '';
        this.fields.o.value = obs.O || '';
        this.fields.jj.value = obs.JJ || '';
        this.fields.mm.value = obs.MM || '';
        this.fields.tt.value = obs.TT || '';
        this.fields.g.value = obs.g !== undefined && obs.g !== null ? obs.g : (obs.G || '');
        this.fields.zs.value = obs.ZS !== -1 && obs.ZS !== null ? obs.ZS : '';
        this.fields.zm.value = obs.ZM !== -1 && obs.ZM !== null ? obs.ZM : '';
        this.fields.d.value = obs.d !== -1 && obs.d !== null ? obs.d : '-1';
        this.fields.dd.value = obs.DD !== -1 && obs.DD !== null ? obs.DD : '-1';
        this.fields.n.value = obs.N !== -1 && obs.N !== null ? obs.N : '-1';
        this.fields.C.value = obs.C !== -1 && obs.C !== null ? obs.C : '-1';
        this.fields.c.value = obs.c !== -1 && obs.c !== null ? obs.c : '-1';
        this.fields.ee.value = obs.EE || '';
        this.fields.h.value = obs.H !== -1 && obs.H !== null ? obs.H : '-1';
        this.fields.F.value = obs.F !== -1 && obs.F !== null ? obs.F : '-1';
        this.fields.v.value = obs.V !== -1 && obs.V !== null ? obs.V : '-1';
        this.fields.f.value = obs.f !== -1 && obs.f !== null ? obs.f : '-1';
        this.fields.zz.value = obs.zz !== -1 && obs.zz !== 99 && obs.zz !== null ? obs.zz : (obs.zz === 99 ? '99' : '-1');
        this.fields.gg.value = obs.GG || '';
        this.fields.ho.value = obs.HO !== -1 && obs.HO !== null ? obs.HO : '-1';
        this.fields.hu.value = obs.HU !== -1 && obs.HU !== null ? obs.HU : '-1';
        this.fields.sectors.value = obs.sectors || '';
        this.fields.remarks.value = obs.remarks || '';
    }
    
    getFormData() {
        return {
            KK: parseInt(this.fields.kk.value),
            O: parseInt(this.fields.o.value),
            JJ: parseInt(this.fields.jj.value),
            MM: parseInt(this.fields.mm.value),
            TT: parseInt(this.fields.tt.value),
            g: parseInt(this.fields.g.value),
            GG: parseInt(this.fields.gg.value),
            ZS: this.fields.zs.value ? parseInt(this.fields.zs.value) : 99,
            ZM: this.fields.zm.value ? parseInt(this.fields.zm.value) : 99,
            DD: this.fields.d.value && this.fields.d.value !== '-1' ? parseInt(this.fields.d.value) : -1,
            d: this.fields.dd.value && this.fields.dd.value !== '-1' ? parseInt(this.fields.dd.value) : -1,
            N: this.fields.n.value && this.fields.n.value !== '-1' ? parseInt(this.fields.n.value) : -1,
            C: this.fields.C.value && this.fields.C.value !== '-1' ? parseInt(this.fields.C.value) : -1,
            c: this.fields.c.value && this.fields.c.value !== '-1' ? parseInt(this.fields.c.value) : -1,
            EE: parseInt(this.fields.ee.value),
            H: this.fields.h.value && this.fields.h.value !== '-1' ? parseInt(this.fields.h.value) : -1,
            F: this.fields.F.value && this.fields.F.value !== '-1' ? parseInt(this.fields.F.value) : -1,
            V: this.fields.v.value && this.fields.v.value !== '-1' ? parseInt(this.fields.v.value) : -1,
            f: this.fields.f.value && this.fields.f.value !== '-1' ? parseInt(this.fields.f.value) : -1,
            zz: this.fields.zz.value && this.fields.zz.value !== '-1' ? parseInt(this.fields.zz.value) : -1,
            HO: this.fields.ho.value && this.fields.ho.value !== '-1' ? parseInt(this.fields.ho.value) : -1,
            HU: this.fields.hu.value && this.fields.hu.value !== '-1' ? parseInt(this.fields.hu.value) : -1,
            sectors: this.fields.sectors.value || '',
            remarks: this.fields.remarks.value || ''
        };
    }
}

// Make it globally available
window.ObservationForm = ObservationForm;
