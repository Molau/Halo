// Monthly Statistics (Monatsstatistik) functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Monthly Statistics page loaded');

    let i18n = null;
    let currentStatsData = null; // Store current stats data for save/print

    // Elements
    const filterDialog = document.getElementById('filter-dialog');
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
            i18n = { monthly_stats: {}, ui: { messages: {} } };
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
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">${i18n.common.ok}</button>
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
        // Month/year label
        const monthYearLabel = document.getElementById('month-year-label');
        if (monthYearLabel) {
            monthYearLabel.textContent = i18n.monthly_stats?.month_year_label;
        }
        
        // Month/year placeholder
        if (monthYearInput) {
            monthYearInput.placeholder = i18n.monthly_stats?.month_year_placeholder;
        }
    }

    // Check if observations are loaded (same approach as monthly_report.js)
    async function checkDataLoaded() {
        try {
            const response = await fetch('/api/observations?limit=1');
            if (response.ok) {
                const data = await response.json();
                if (data.total > 0 && data.file) {
                    return true;
                }
            }
        } catch (error) {
            console.error('Error checking server data:', error);
        }
        
        // No data loaded - show same warning as monthly_report
        const msg = i18n.dialogs?.no_data?.message || i18n.observations?.no_file_loaded || 'No observations loaded.';
        showWarningModal(msg);
        return false;
    }

    // Validate month/year input
    function validateMonthYear(input) {
        const trimmed = input.trim();
        const parts = trimmed.split(/\s+/);
        
        if (parts.length !== 2) {
            return {
                valid: false,
                error: i18n.monthly_stats?.error_invalid_format
            };
        }
        
        const mm = parseInt(parts[0]);
        const jj = parseInt(parts[1]);
        
        if (isNaN(mm) || mm < 1 || mm > 12) {
            return {
                valid: false,
                error: i18n.monthly_stats?.error_invalid_month
            };
        }
        
        if (isNaN(jj) || jj < 0 || jj > 99) {
            return {
                valid: false,
                error: i18n.monthly_stats?.error_invalid_year
            };
        }
        
        return {
            valid: true,
            mm: mm,
            jj: jj
        };
    }

    // Show month/year error
    function showMonthYearError(message) {
        if (monthYearError) {
            monthYearError.textContent = message;
            monthYearError.style.display = 'block';
            monthYearInput?.classList.add('is-invalid');
        }
    }

    // Hide month/year error
    function hideMonthYearError() {
        if (monthYearError) {
            monthYearError.style.display = 'none';
            monthYearInput?.classList.remove('is-invalid');
        }
    }

    // Apply filter and generate statistics
    async function applyFilter() {
        hideMonthYearError();
        
        // Validate month/year input
        const monthYearValue = monthYearInput?.value || '';
        if (!monthYearValue.trim()) {
            showMonthYearError(i18n.monthly_stats?.error_month_year_required);
            return;
        }
        
        const validation = validateMonthYear(monthYearValue);
        if (!validation.valid) {
            showMonthYearError(validation.error);
            return;
        }
        
        // Show spinner
        if (applySpinner) applySpinner.style.display = 'inline-block';
        if (btnApply) btnApply.disabled = true;
        
        try {
            // Fetch monthly statistics
            const url = `/api/monthly-stats?mm=${validation.mm}&jj=${validation.jj}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                showMonthYearError(data.error || 'Error fetching statistics');
                return;
            }
            
            if (data.count === 0) {
                showMonthYearError(i18n.monthly_stats?.error_no_data);
                return;
            }
            
            // Store data for save/print
            currentStatsData = data;
            
            // Debug: log the data
            console.log('Monthly stats data:', data);
            console.log('Observer overview:', data.observer_overview);
            
            // Close filter dialog
            const modal = bootstrap.Modal.getInstance(filterDialog);
            modal?.hide();
            
            // Show results
            showStatistics(data);
            
        } catch (error) {
            console.error('Error fetching statistics:', error);
            showMonthYearError('Error fetching statistics');
        } finally {
            // Hide spinner
            if (applySpinner) applySpinner.style.display = 'none';
            if (btnApply) btnApply.disabled = false;
        }
    }

    // Show statistics in results modal
    function showStatistics(data) {
        const statsContent = document.getElementById('stats-content');
        if (!statsContent) return;
        
        // Get month name (months array is 1-indexed in i18n)
        const months = i18n.months || {};
        const monthName = months[data.mm] || months[data.mm.toString()];
        
        // Format year
        const year = data.jj >= 50 ? `19${data.jj.toString().padStart(2, '0')}` : 
                     `20${data.jj.toString().padStart(2, '0')}`;
        
        // Set title
        const resultsTitle = document.getElementById('results-modal-title');
        if (resultsTitle) {
            resultsTitle.textContent = `${i18n.monthly_stats?.title} - ${monthName} ${year}`;
        }
        
        // Build statistics HTML
        let html = '<div class="statistics-report" style="font-family: monospace; white-space: pre; font-size: 11px;">';
        
        // Title (centered)
        const titleLine = `${i18n.monthly_stats?.title} ${monthName} ${year}`;
        const titlePadding = Math.max(0, Math.floor((86 - titleLine.length) / 2));
        html += ' '.repeat(titlePadding) + titleLine + '\n';
        html += ' '.repeat(titlePadding) + '═'.repeat(titleLine.length) + '\n\n';
        
        // Table 1: Observer Overview (Beobachterübersicht)
        if (data.observer_overview && data.observer_overview.length > 0) {
            html += renderObserverOverview(data.observer_overview, monthName, year);
        }
        
        html += '</div>';
        
        statsContent.innerHTML = html;
        
        // Show results modal
        const resultsModal = new bootstrap.Modal(document.getElementById('results-modal'), {
            backdrop: true,
            keyboard: false
        });
        resultsModal.show();
        
        // Wire up action buttons
        setupActionButtons();
    }
    
    // Render observer overview table
    function renderObserverOverview(observers, monthName, year) {
        let html = '';
        
        // Table header
        html += '╔' + '═'.repeat(86) + '╗\n';
        const headerText = `Beobachterübersicht ${monthName} ${year}`;
        const headerPadding = Math.max(0, Math.floor((86 - headerText.length) / 2));
        html += '║' + ' '.repeat(headerPadding) + headerText + ' '.repeat(86 - headerPadding - headerText.length) + '║\n';
        html += '╠════╦══════════╦══════════╦══════════╦══════════╦══════════╦════════════╦═════════════╣\n';
        html += '║KKGG║ 1   3   5║   7   9  ║11  13  15║  17  19  ║21  23  25║  27  29  31║ 1) 2) 3) 4) ║\n';
        html += '║    ║   2   4  ║ 6   8  10║  12  14  ║16  18  20║  22  24  ║26  28  30  ║             ║\n';
        html += '╠════╬══════════╬══════════╬══════════╬══════════╬══════════╬════════════╬═════════════╣\n';
        
        // Data rows
        let rowCount = 0;
        for (const obs of observers) {
            const kk = obs.kk.toString().padStart(2, '0');
            const gg = obs.region === 39 ? '//' : obs.region.toString().padStart(2, '0');
            
            html += '║' + kk + gg + '║';
            
            // Days 1-31 in groups of 5
            for (let day = 1; day <= 31; day++) {
                const dayData = obs.days[day];
                let cellValue = '  ';
                if (dayData) {
                    const solar = dayData.solar || 0;
                    const lunar = dayData.lunar || false;
                    if (solar > 0 && lunar) cellValue = '_' + solar.toString().padStart(1);
                    else if (solar > 0) cellValue = solar.toString().padStart(2);
                    else if (lunar) cellValue = ' X';
                }
                html += cellValue;
                
                // Add spacing between days within group, or column separator after every 5 days
                if (day % 5 === 0 && day !== 30) {
                    html += '║';
                }
            }
            html += '║';
            
            // Summary columns
            html += obs.total_solar.toString().padStart(3) + ' ';
            html += obs.days_solar.toString().padStart(2) + ' ';
            html += obs.days_lunar.toString().padStart(2) + ' ';
            html += obs.total_days.toString().padStart(2) + ' ';
            html += '║\n';
            
            rowCount++;
            
            // Add separator every 5 rows (but not at the end)
            if (rowCount % 5 === 0 && rowCount < observers.length) {
                html += '╠════╬══════════╬══════════╬══════════╬══════════╬══════════╬═════════════╬════════════╣\n';
            }
        }
        
        // Table footer
        html += '╠════╩══════════╩══════════╩══════════╩══════════╩══════════╩═════════════╩════════════╣\n';
        html += '║  1) = EE (Sonne)   2) = Tage (Sonne)   3) = Tage (Mond)   4) = Tage (gesamt)         ║\n';
        html += '╚' + '═'.repeat(86) + '╝\n\n';
        
        return html;
    }

    // Event handlers
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
    
    if (btnApply) {
        btnApply.addEventListener('click', applyFilter);
    }
    
    if (monthYearInput) {
        monthYearInput.addEventListener('input', hideMonthYearError);
    }
    
    // Enter key support when filter dialog is visible
    const filterEnterKeyHandler = (e) => {
        if (e.key === 'Enter' && filterDialog.classList.contains('show')) {
            e.preventDefault();
            applyFilter();
        }
    };
    
    // Remove any existing handler first to avoid duplicates
    document.removeEventListener('keypress', filterEnterKeyHandler);
    document.addEventListener('keypress', filterEnterKeyHandler);
    
    // Setup action button handlers
    function setupActionButtons() {
        const btnStatsOk = document.getElementById('btn-stats-ok');
        const btnStatsPrint = document.getElementById('btn-stats-print');
        const btnStatsSave = document.getElementById('btn-stats-save');
        const resultsModal = document.getElementById('results-modal');
        
        // OK button - close modal and return to main
        if (btnStatsOk) {
            btnStatsOk.onclick = () => {
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
        if (btnStatsPrint) {
            btnStatsPrint.onclick = () => {
                window.print();
            };
        }
        
        // Save button
        if (btnStatsSave) {
            btnStatsSave.onclick = () => {
                if (!currentStatsData) return;
                
                const data = currentStatsData;
                const monthShort = i18n.months_short?.[data.mm] || String(data.mm).padStart(2, '0');
                const jjPadded = String(data.jj).padStart(2, '0');
                const filename = `${monthShort.toLowerCase()}19${jjPadded}.txt`;
                
                const text = generateStatsText();
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
    
    // Generate plain text statistics content for save
    function generateStatsText() {
        if (!currentStatsData) return '';
        
        const data = currentStatsData;
        const months = i18n.months || {};
        const monthName = months[data.mm] || months[data.mm.toString()];
        const year = data.jj >= 50 ? `19${data.jj.toString().padStart(2, '0')}` : 
                     `20${data.jj.toString().padStart(2, '0')}`;
        
        let text = '';
        
        // Title (centered)
        const titleLine = `${i18n.monthly_stats?.title} ${monthName} ${year}`;
        const titlePadding = Math.max(0, Math.floor((86 - titleLine.length) / 2));
        text += ' '.repeat(titlePadding) + titleLine + '\n';
        text += ' '.repeat(titlePadding) + '═'.repeat(titleLine.length) + '\n\n';
        
        // Table 1: Observer Overview
        if (data.observer_overview && data.observer_overview.length > 0) {
            const observers = data.observer_overview;
            
            // Table header
            text += '╔' + '═'.repeat(86) + '╗\n';
            const headerText = `Beobachterübersicht ${monthName} ${year}`;
            const headerPadding = Math.max(0, Math.floor((86 - headerText.length) / 2));
            text += '║' + ' '.repeat(headerPadding) + headerText + ' '.repeat(86 - headerPadding - headerText.length) + '║\n';
            text += '╠════╦═══════════╦══════════╦══════════╦══════════╦══════════╦═════════════╦═════════════╣\n';
            text += '║KKGG║ 1   3   5 ║   7   9  ║11  13  15║  17  19  ║21  23  25║  27  29  31 ║ 1) 2) 3) 4) ║\n';
            text += '║    ║   2   4   ║ 6   8  10║  12  14  ║16  18  20║  22  24  ║26  28  30   ║             ║\n';
            text += '╠════╬═══════════╬══════════╬══════════╬══════════╬══════════╬══════════════╬═════════════╣\n';
            
            // Data rows
            let rowCount = 0;
            for (const obs of observers) {
                const kk = obs.kk.toString().padStart(2, '0');
                const gg = obs.region === 39 ? '//' : obs.region.toString().padStart(2, '0');
                
                text += '║' + kk + gg + '║';
                
                // Days 1-31 in groups of 5
                for (let day = 1; day <= 31; day++) {
                    const dayData = obs.days[day];
                    let cellValue = '  ';
                    if (dayData) {
                        const solar = dayData.solar || 0;
                        const lunar = dayData.lunar || false;
                        if (solar > 0 && lunar) cellValue = '_' + solar.toString().padStart(1);
                        else if (solar > 0) cellValue = solar.toString().padStart(2);
                        else if (lunar) cellValue = ' X';
                    }
                    text += cellValue;
                    
                    // Add spacing between days within group, or column separator after every 5 days
                    if (day % 5 === 0 && day !== 30) {
                        text += '║';
                    } else if (day < 31) {
                        text += ' ';
                    }
                }
                text += '║';
                
                // Summary columns
                text += obs.total_solar.toString().padStart(3) + ' ';
                text += obs.days_solar.toString().padStart(2) + ' ';
                text += obs.days_lunar.toString().padStart(2) + ' ';
                text += obs.total_days.toString().padStart(2) + ' ';
                text += '║\n';
                
                rowCount++;
                
                // Add separator every 5 rows (but not at the end)
                if (rowCount % 5 === 0 && rowCount < observers.length) {
                    text += '╠════╬════════════╬══════════╬══════════╬══════════╬══════════╬══════════════╬═════════════╣\n';
                }
            }
            
            // Table footer
            text += '╠════╩════════════╩══════════╩══════════╩══════════╩══════════╩══════════════╩═════════════╣\n';
            text += '║  1) = EE (Sonne)   2) = Tage (Sonne)   3) = Tage (Mond)   4) = Tage (gesamt)         ║\n';
            text += '╚' + '═'.repeat(86) + '╝\n\n';
        }
        
        return text;
    }

    // Initialize
    async function initialize() {
        await loadI18n();
        
        // Check if data is already loaded on the server (same as monthly_report.js)
        const dataLoaded = await checkDataLoaded();
        
        if (dataLoaded) {
            // Show filter dialog automatically with explicit backdrop configuration
            const modal = new bootstrap.Modal(filterDialog, {
                backdrop: true,
                keyboard: false
            });
            modal.show();
        }
    }

    initialize();
});
