// Monthly Report (Monatsmeldung) functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Monthly Report page loaded');

    let i18n = null;
    let allObservers = [];
    let fixedObserver = '';
    let currentReportData = null; // Store current report data for save/print

    // Elements
    const filterDialog = document.getElementById('filter-dialog');
    const observerSelect = document.getElementById('observer-select');
    const monthYearInput = document.getElementById('month-year-input');
    const monthYearError = document.getElementById('month-year-error');
    const btnCancel = document.getElementById('btn-cancel-filter');
    const btnApply = document.getElementById('btn-apply-filter');
    const applySpinner = document.getElementById('apply-spinner');

    // Load i18n strings
    async function loadI18n() {
        try {
            const langResponse = await fetch('/api/language');
            const langData = await langResponse.json();
            const lang = langData.language || 'de';

            const i18nResponse = await fetch(`/api/i18n/${lang}`);
            i18n = await i18nResponse.json();
            console.log('i18n loaded:', i18n);
            
            // Update UI text
            updateUIText();
        } catch (error) {
            console.error('Error loading i18n:', error);
            i18n = { monthly_report: {}, ui: { messages: {} } };
        }
    }
    
    // Show warning modal (same style as main.js)
    function showWarningModal(message) {
        const modalHtml = `
            <div class="modal fade" id="warning-modal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18n.common.warning}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary btn-sm px-4" data-bs-dismiss="modal">${i18n.common.ok}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('warning-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
            window.location.href = '/';
        });
    }

    // Update UI text from i18n
    function updateUIText() {
        // Filter dialog title already set by template
        
        // Observer label
        const observerLabel = document.getElementById('observer-label');
        if (observerLabel) {
            observerLabel.textContent = i18n.observers?.select_observer;
        }
        
        // Observer select placeholder
        const observerPlaceholder = document.getElementById('observer-select-placeholder');
        if (observerPlaceholder) {
            observerPlaceholder.textContent = '-- ' + i18n.observers?.select_prompt + ' --';
        }
        
        // Month/year label
        const monthYearLabel = document.getElementById('month-year-label');
        if (monthYearLabel) {
            monthYearLabel.textContent = i18n.monthly_report?.month_year_label;
        }
        
        // Month/year placeholder
        const monthYearInput = document.getElementById('month-year-input');
        if (monthYearInput) {
            monthYearInput.placeholder = i18n.monthly_report?.month_year_placeholder;
        }
    }

    // Load observers
    async function loadObservers() {
        try {
            const response = await fetch('/api/observers');
            if (response.ok) {
                const data = await response.json();
                allObservers = data.observers || [];
                console.log('Loaded', allObservers.length, 'observer records');
                populateObserverSelect();
            }
        } catch (error) {
            console.error('Error loading observers:', error);
        }
    }

    // Load fixed observer setting
    async function loadFixedObserver() {
        try {
            const response = await fetch('/api/config/fixed_observer');
            if (response.ok) {
                const data = await response.json();
                fixedObserver = data.observer || '';
                console.log('Fixed observer:', fixedObserver);
            }
        } catch (error) {
            console.error('Error loading fixed observer:', error);
        }
    }

    // Populate observer dropdown
    function populateObserverSelect() {
        const placeholder = '-- ' + i18n.observers?.select_prompt + ' --';
        observerSelect.innerHTML = `<option value="">${placeholder}</option>`;

        // Get unique observers (latest record per KK)
        const observerMap = new Map();
        
        for (const obs of allObservers) {
            // Observer data format from API: { KK, VName, NName, seit, aktiv, HbOrt, GH, ... }
            const kk = parseInt(obs.KK);
            const seit = obs.seit;
            
            if (!observerMap.has(kk) || seit > observerMap.get(kk).seit) {
                observerMap.set(kk, {
                    kk: kk,
                    vname: obs.VName || '',
                    nname: obs.NName || '',
                    seit: seit
                });
            }
        }

        // Convert to array and sort by KK
        const observers = Array.from(observerMap.values()).sort((a, b) => a.kk - b.kk);

        // Add to select
        for (const obs of observers) {
            const option = document.createElement('option');
            option.value = obs.kk;
            option.textContent = `${String(obs.kk).padStart(2, '0')} ${obs.vname} ${obs.nname}`;
            observerSelect.appendChild(option);
        }

        // Pre-select fixed observer if configured
        if (fixedObserver) {
            const fixedKK = parseInt(fixedObserver);
            if (observerMap.has(fixedKK)) {
                observerSelect.value = fixedKK;
                console.log('Pre-selected fixed observer:', fixedKK);
            }
        }
    }

    // Validate month/year input
    function validateMonthYear(input) {
        monthYearError.style.display = 'none';
        
        if (!input || input.trim() === '') {
            const msg = i18n.monthly_report?.error_month_year_required;
            monthYearError.textContent = msg;
            monthYearError.style.display = 'block';
            return null;
        }

        // Parse input: "MM JJ" format
        const parts = input.trim().split(/\s+/);
        if (parts.length !== 2) {
            const msg = i18n.monthly_report?.error_invalid_format;
            monthYearError.textContent = msg;
            monthYearError.style.display = 'block';
            return null;
        }

        const mm = parseInt(parts[0]);
        const jj = parseInt(parts[1]);

        // Validate month (1-12)
        if (isNaN(mm) || mm < 1 || mm > 12) {
            const msg = i18n.monthly_report?.error_invalid_month;
            monthYearError.textContent = msg;
            monthYearError.style.display = 'block';
            return null;
        }

        // Validate year (0-99, representing 1900-1999 or 2000-2099)
        if (isNaN(jj) || jj < 0 || jj > 99) {
            const msg = i18n.monthly_report?.error_invalid_year;
            monthYearError.textContent = msg;
            monthYearError.style.display = 'block';
            return null;
        }

        return { mm, jj };
    }

    // Apply filter
    async function applyFilter() {
        const selectedKK = observerSelect.value;
        const monthYearValue = monthYearInput.value;

        // Validate observer selection
        if (!selectedKK) {
            alert(i18n.monthly_report?.error_no_observer);
            observerSelect.focus;
            return;
        }

        // Validate month/year
        const dateInfo = validateMonthYear(monthYearValue);
        if (!dateInfo) {
            monthYearInput.focus();
            return;
        }

        // Show loading spinner
        applySpinner.style.display = 'inline-block';
        btnApply.disabled = true;

        try {
            // Fetch monthly report data
            const response = await fetch(`/api/monthly-report?kk=${selectedKK}&mm=${dateInfo.mm}&jj=${dateInfo.jj}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('API error:', errorData);
                throw new Error(errorData.error);
            }
            
            const data = await response.json();
            console.log('Report data received:', data);
            
            // Close filter dialog
            const modal = bootstrap.Modal.getInstance(filterDialog);
            modal.hide();

            // Display the report
            displayMonthlyReport(data);

        } catch (error) {
            console.error('Error generating report:', error);
            const errorMsg = i18n.ui.messages.error;
            alert(errorMsg);
        } finally {
            applySpinner.style.display = 'none';
            btnApply.disabled = false;
        }
    }

    // Event listeners
    btnCancel.addEventListener('click', () => {
        window.location.href = '/';
    });

    btnApply.addEventListener('click', applyFilter);

    // Enter key support for both inputs
    monthYearInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilter();
        }
    });
    
    observerSelect.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilter();
        }
    });

    // ESC key support - close dialog and return to main
    const escKeyHandler = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            window.location.href = '/';
        }
    };
    
    document.addEventListener('keydown', escKeyHandler);

    // Auto-format month/year input
    monthYearInput.addEventListener('input', (e) => {
        let value = e.target.value;
        // Remove non-digits and non-spaces
        value = value.replace(/[^\d\s]/g, '');
        // Ensure single space between parts
        value = value.replace(/\s+/g, ' ');
        e.target.value = value;
        
        // Clear error on input
        if (monthYearError.style.display !== 'none') {
            monthYearError.style.display = 'none';
        }
    });

    // Kurzausgabe formatter (from observations.js)
    function kurzausgabe(obs) {
        let first = '';
        
        // KK - observer code
        if (obs.KK < 100) {
            first += String(Math.floor(obs.KK / 10)) + String(obs.KK % 10);
        } else {
            first += String.fromCharCode(Math.floor(obs.KK / 10) + 55) + String(obs.KK % 10);
        }
        
        // O, JJ, MM, TT, g
        first += String(obs.O);
        first += String(Math.floor(obs.JJ / 10)) + String(obs.JJ % 10);
        first += String(Math.floor(obs.MM / 10)) + String(obs.MM % 10);
        first += String(Math.floor(obs.TT / 10)) + String(obs.TT % 10);
        first += String(obs.g);
        
        // ZS, ZM
        first += (obs.ZS === null) ? '//' : String(Math.floor(obs.ZS / 10)) + String(obs.ZS % 10);
        first += (obs.ZM === null) ? '//' : String(Math.floor(obs.ZM / 10)) + String(obs.ZM % 10);
        
        // d, DD
        first += (obs.d === null) ? '/' : String(obs.d);
        first += (obs.DD === null) ? '//' : String(Math.floor(obs.DD / 10)) + String(obs.DD % 10);
        
        // N, C, c
        first += (obs.N === null) ? '/' : String(obs.N);
        first += (obs.C === null) ? '/' : String(obs.C);
        first += (obs.c === null) ? '/' : String(obs.c);
        
        // EE
        first += String(Math.floor(obs.EE / 10)) + String(obs.EE % 10);
        
        // H, F, V
        first += (obs.H === null) ? '/' : String(obs.H);
        first += (obs.F === null) ? '/' : String(obs.F);
        first += (obs.V === null) ? '/' : String(obs.V);
        
        // f, zz, GG
        first += (obs.f === null) ? ' ' : String(obs.f);
        first += (obs.zz === null) ? '  ' : (obs.zz === 99) ? '//' : String(Math.floor(obs.zz / 10)) + String(obs.zz % 10);
        const gg = obs.GG || 0;
        first += String(Math.floor(gg / 10)) + String(gg % 10);
        
        // Add spaces after every 5 characters
        let erg = '';
        for (let i = 0; i < first.length; i += 5) {
            const chunk = first.substring(i, i + 5);
            if (chunk) {
                erg += chunk;
                if (chunk.length === 5) erg += ' ';
            }
        }
        
        // 8HHHH - light pillar
        if (obs.EE === 8) {
            erg += (obs.HO === null) ? '8////' : '8' + String(Math.floor(obs.HO / 10)) + String(obs.HO % 10) + '//';
        } else if (obs.EE === 9) {
            erg += (obs.HU === null) ? '8////' : '8//' + String(Math.floor(obs.HU / 10)) + String(obs.HU % 10);
        } else if (obs.EE === 10) {
            erg += '8';
            erg += (obs.HO === null) ? '//' : String(Math.floor(obs.HO / 10)) + String(obs.HO % 10);
            erg += (obs.HU === null) ? '//' : String(Math.floor(obs.HU / 10)) + String(obs.HU % 10);
        } else {
            erg += '/////';
        }
        
        // Add sectors and remarks - total line must be exactly 69 chars
        // Current erg is about 41 chars (with spaces every 5 chars)
        // We have 28 chars left for sectors + remarks
        erg += ' ';  // 42 chars now
        const sectors = (obs.sectors || '').replace(/[\r\n]/g, ' ').substring(0, 15).padEnd(15, ' ');  // 15 chars for sectors
        erg += sectors + ' ';  // 59 chars now
        const remarks = (obs.remarks || '').replace(/[\r\n]/g, ' ').padEnd(60, ' ');
        erg += remarks;
        
        return erg;
    }

    // Display monthly report
    function displayMonthlyReport(data) {
        const resultsModal = document.getElementById('results-modal');
        const reportContent = document.getElementById('report-content');
        const reportTitle = document.getElementById('results-modal-title');
        
        // Store current report data for save/print operations
        currentReportData = data;
        
        // Use i18n month names
        const monthName = i18n.months?.[data.mm] || data.mm;
        
        // Format title
        const year = data.jj < 50 ? 2000 + data.jj : 1900 + data.jj;
        const title = i18n.monthly_report.report_title_template
            .replace('{observer}', data.observer_name)
            .replace('{month}', monthName)
            .replace('{year}', year);
        
        // Modal title shows i18n title
        reportTitle.textContent = i18n.output?.monthly_report;
        
        // Build report content
        let html = '<pre style="font-family: monospace; font-size: 14px; line-height: 1.4;">';
        
        // Header box
        const titlePadLeft = Math.floor((122 - title.length) / 2);
        html += ' '.repeat(titlePadLeft) + title + '\n';
        html += ' '.repeat(titlePadLeft) + '═'.repeat(title.length) + '\n\n';
        html += '╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗\n';
        const sectors = i18n.monthly_report.sectors;
        const remarks = i18n.monthly_report.remarks;
        const headerLine = `KKOJJ MMTTg ZZZZd DDNCc EEHFV fzzGG 8HHHH ${sectors.padEnd(15)} ${remarks.padEnd(47)}`;
        html += '║ ' + headerLine.substring(0, 118).padEnd(118) + ' ║\n';
        html += '╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\n';
        // Title line inside box
        
        // Observations
        let lastDay = -1;
        for (const obs of data.observations) {
            // Add separator line between different days
            if (lastDay !== -1 && obs.TT !== lastDay) {
                html += '╟────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╢\n';
            }
            
            try {
                html += '║ ' + kurzausgabe(obs) + ' ║\n';
            } catch (err) {
                console.error('Error formatting observation:', obs, err);
                html += '║ ERROR formatting observation                                                                                           ║\n';
            }
            lastDay = obs.TT;
        }
        
        // No observations message
        if (data.observations.length === 0) {
            const noObsMsg = i18n.ui?.messages?.no_observations;
            const padding = Math.floor((118 - noObsMsg.length) / 2);
            html += '║' + ' '.repeat(120) + '║\n';
            html += '║' + ' '.repeat(padding) + noObsMsg + ' '.repeat(120 - padding - noObsMsg.length) + '║\n';
            html += '║' + ' '.repeat(120) + '║\n';
        }
        
        // Footer
        html += '╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\n';
        let hbLine = i18n.monthly_report.main_location + ': ' + data.observer_hbort;
        let nbLine = i18n.monthly_report.secondary_location + ': ' + data.observer_nbort;
        const hbPadLeft = Math.floor((122 - hbLine.length) / 2);
        hbLine = ' '.repeat(hbPadLeft) + hbLine;
        nbLine = ' '.repeat(hbPadLeft) + nbLine;
        html += '║' + hbLine.substring(0, 118).padEnd(120, ' ') + '║\n';
        html += '║' + nbLine.substring(0, 118).padEnd(120, ' ') + '║\n';
        html += '╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n';
        
        html += '</pre>';
        
        reportContent.innerHTML = html;
        
        // Show modal
        const modal = new bootstrap.Modal(resultsModal, {
            backdrop: true,
            keyboard: false
        });
        modal.show();
        
        // Wire up action buttons
        setupActionButtons();
    }
    
    // Generate plain text report content for save/print (reuses modal display layout)
    function generateReportText() {
        if (!currentReportData) return '';
        
        const data = currentReportData;
        const monthName = i18n.months[data.mm];
        const year = data.jj < 50 ? 2000 + data.jj : 1900 + data.jj;
        const title = i18n.monthly_report.report_title_template
            .replace('{observer}', data.observer_name)
            .replace('{month}', monthName)
            .replace('{year}', year);
        
        let text = '';
        
        // Header box (same as modal display)
        const titlePadLeft = Math.floor((122 - title.length) / 2);
        text += ' '.repeat(titlePadLeft) + title + '\n';
        text += ' '.repeat(titlePadLeft) + '═'.repeat(title.length) + '\n\n';
        text += '╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗\n';
        const sectors = i18n.monthly_report.sectors;
        const remarks = i18n.monthly_report.remarks;
        const headerLine = `KKOJJ MMTTg ZZZZd DDNCc EEHFV fzzGG 8HHHH ${sectors.padEnd(15)} ${remarks.padEnd(47)}`;
        text += '║ ' + headerLine.substring(0, 118).padEnd(118) + ' ║\n';
        text += '╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\n';
        
        // Observations (same as modal display)
        let lastDay = -1;
        for (const obs of data.observations) {
            if (lastDay !== -1 && obs.TT !== lastDay) {
                text += '╟────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╢\n';
            }
            try {
                text += '║ ' + kurzausgabe(obs) + ' ║\n';
            } catch (err) {
                console.error('Error formatting observation:', obs, err);
                text += '║ ERROR formatting observation                                                                                           ║\n';
            }
            lastDay = obs.TT;
        }
        
        // No observations message (same as modal display)
        if (data.observations.length === 0) {
            const noObsMsg = i18n.ui?.messages?.no_observations;
            const padding = Math.floor((118 - noObsMsg.length) / 2);
            text += '║' + ' '.repeat(118) + '║\n';
            text += '║' + ' '.repeat(padding) + noObsMsg + ' '.repeat(118 - padding - noObsMsg.length) + '║\n';
            text += '║' + ' '.repeat(118) + '║\n';
        }
        
        // Footer (same as modal display)
        text += '╠════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\n';
        let hbLine = i18n.monthly_report.main_location + ': ' + data.observer_hbort;
        let nbLine = i18n.monthly_report.secondary_location + ': ' + data.observer_nbort;
        const hbPadLeft = Math.floor((122 - hbLine.length) / 2);
        hbLine = ' '.repeat(hbPadLeft) + hbLine;
        nbLine = ' '.repeat(hbPadLeft) + nbLine;
        text += '║' + hbLine.substring(0, 118).padEnd(120, ' ') + '║\n';
        text += '║' + nbLine.substring(0, 118).padEnd(120, ' ') + '║\n';
        text += '╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n';
        
        return text;
    }
    
    // Setup action button handlers
    function setupActionButtons() {
        const btnOk = document.getElementById('btn-report-ok');
        const btnPrint = document.getElementById('btn-report-print');
        const btnSave = document.getElementById('btn-report-save');
        const resultsModal = document.getElementById('results-modal');
        
        // OK button - close modal and return to main
        if (btnOk) {
            btnOk.onclick = () => {
                const modal = bootstrap.Modal.getInstance(resultsModal);
                if (modal) modal.hide();
                window.location.href = '/';
            };
        }
        
        // Enter key support when modal is visible
        const enterKeyHandler = (e) => {
            if (e.key === 'Enter' && resultsModal.classList.contains('show')) {
                e.preventDefault();
                const modal = bootstrap.Modal.getInstance(resultsModal);
                if (modal) modal.hide();
                window.location.href = '/';
            }
        };
        
        // Remove any existing handler first to avoid duplicates
        document.removeEventListener('keypress', enterKeyHandler);
        document.addEventListener('keypress', enterKeyHandler);
        
        // Print button
        if (btnPrint) {
            btnPrint.onclick = () => {
                const reportContent = document.getElementById('report-content');
                if (reportContent) {
                    const printTitle = i18n.menus?.output?.monthly_report;
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`<html><head><title>${printTitle}</title>`);
                    printWindow.document.write('<style>body { font-family: monospace; white-space: pre; }</style>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(reportContent.textContent || '');
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                        printWindow.print();
                    }, 250);
                }
            };
        }
        
        // Save button - format: KK-MONTHJJ.TXT (e.g., 44-MAR88.TXT)
        if (btnSave) {
            btnSave.onclick = () => {
                if (!currentReportData) return;
                
                const data = currentReportData;
                const monthShort = i18n.months_short?.[data.mm] || String(data.mm).padStart(2, '0');
                const kkPadded = String(data.kk).padStart(2, '0');
                const jjPadded = String(data.jj).padStart(2, '0');
                const filename = `${kkPadded}-${monthShort.toUpperCase()}${jjPadded}.TXT`;
                
                const text = generateReportText();
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
        }
    }

    // Initialize
    async function initialize() {
        await loadI18n();
        
        // Check if data is already loaded on the server (same as observations.js)
        try {
            const response = await fetch('/api/observations?limit=1');
            if (response.ok) {
                const data = await response.json();
                if (data.total > 0 && data.file) {
                    // Data is loaded on server
                    
                    // Load observers and show filter dialog
                    await loadFixedObserver();
                    await loadObservers();

                    // Show filter dialog with explicit backdrop configuration
                    const modal = new bootstrap.Modal(filterDialog, {
                        backdrop: true,
                        keyboard: false
                    });
                    modal.show();
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking server data:', error);
        }
        
        // No data loaded
        const msg = i18n.dialogs.no_data.message;
        showWarningModal(msg);
    }

    initialize();
});
