// Monthly Statistics (Monatsstatistik) functionality
document.addEventListener('DOMContentLoaded', async function() {


    let i18n = null;
    let currentStatsData = null; // Store current stats data for save/print

    // Elements
    const filterDialog = document.getElementById('filter-dialog');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
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

    // Placeholder is already set in HTML template via Jinja2

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
        const msg = i18n.dialogs.no_data.message;
        showWarningModal(msg);
        return false;
    }

    // Validate month/year selection from dropdowns
    function validateMonthYear() {
        monthYearError.style.display = 'none';
        
        const mm = monthSelect.value;
        const jj = yearSelect.value;
        
        if (!mm || !jj) {
            const msg = i18n.monthly_stats?.error_month_year_required;
            monthYearError.textContent = msg;
            monthYearError.style.display = 'block';
            return null;
        }

        return { 
            mm: String(parseInt(mm)).padStart(2, '0'), 
            jj: String(parseInt(jj)).padStart(2, '0')
        };
    }

    // Load date defaults (same helper used by monthly report)
    async function loadDateDefault() {
        try {
            const dateDefault = await getDateDefault();
            if (dateDefault) {
                if (monthSelect) {
                    monthSelect.value = dateDefault.month;
                }
                if (yearSelect) {
                    yearSelect.value = dateDefault.jj;
                }
            }
        } catch (error) {
            console.error('Error loading date default:', error);
        }
    }

    // Populate year dropdown
    function populateYears() {
        const startYear = 1950;
        const endYear = 2049;
        
        for (let year = startYear; year <= endYear; year++) {
            const yy = String(year % 100).padStart(2, '0');
            const option = document.createElement('option');
            option.value = yy;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    // Apply filter and generate statistics
    async function applyFilter() {
        // Validate month/year
        const dateInfo = validateMonthYear();
        if (!dateInfo) {
            monthSelect.focus();
            return;
        }

        // Show spinner
        if (applySpinner) applySpinner.style.display = 'inline-block';
        if (btnApply) btnApply.disabled = true;
        
        try {
            // Fetch monthly statistics
            const url = `/api/monthly-stats?mm=${dateInfo.mm}&jj=${dateInfo.jj}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('API error:', errorData);
                throw new Error(errorData.error);
            }
            
            const data = await response.json();

            
            // Close filter dialog
            const modal = bootstrap.Modal.getInstance(filterDialog);
            modal?.hide();

            // Display the statistics
            showStatistics(data);

        } catch (error) {
            console.error('Error generating statistics:', error);
            const errorMsg = i18n.ui.messages.error;
            alert(errorMsg);
        } finally {
            applySpinner.style.display = 'none';
            btnApply.disabled = false;
        }
    }

    // Show statistics in results modal
    async function showStatistics(data) {
        const statsContent = document.getElementById('stats-content');
        if (!statsContent) return;
        
        // Check output mode setting
        let outputMode = 'P'; // Default: Pseudografik
        try {
            const modeResponse = await fetch('/api/config/outputmode');
            const modeData = await modeResponse.json();
            outputMode = modeData.mode || 'P';
        } catch (error) {
            console.error('Error fetching output mode:', error);
        }
        
        // Get month name (months array is 1-indexed in i18n)
        const months = i18n.months || {};
        const monthName = months[data.mm] || months[data.mm.toString()];
        
        // Format year
        const year = data.jj >= 50 ? `19${data.jj.toString().padStart(2, '0')}` : 
                     `20${data.jj.toString().padStart(2, '0')}`;
        
        // Set title
        const resultsTitle = document.getElementById('results-modal-title');
        if (resultsTitle) {
            resultsTitle.textContent = i18n.monthly_stats?.title;
        }
        
        // Build statistics HTML based on output mode
        let html = '';
        
        if (outputMode === 'P') {
            // Pseudografik format (current implementation)
            html = buildPseudografikMonthlyStats(data, monthName, year, i18n);
        } else {
            // HTML-Tabellen format (stub)
            html = buildHTMLTableMonthlyStats(data, monthName, year, i18n);
        }
        
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
        const headerText = `${i18n.monthly_stats?.observer_overview} ${monthName} ${year}`;
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
                html += '╠════╬══════════╬══════════╬══════════╬══════════╬══════════╬════════════╬═════════════╣\n';
            }
        }
        
        // Table footer
        html += '╠════╩══════════╩══════════╩══════════╩══════════╩══════════╩═════════════╩════════════╣\n';
        html += '║  1) = EE (Sonne)   2) = Tage (Sonne)   3) = Tage (Mond)   4) = Tage (gesamt)         ║\n';
        html += '╚' + '═'.repeat(86) + '╝\n\n';
        
        return html;
    }

    // Render EE overview table (Ergebnisübersicht Sonnenhalos)
    function renderEEOverview(eeData, dailyTotals, grandTotal, monthName, year) {
        let html = '';
        
        // Table header
        html += '    ╔' + '═'.repeat(76) + '╗\n';
        const headerText = `${i18n.monthly_stats?.ee_overview} ${monthName} ${year}`;
        const headerPadding = Math.max(0, Math.floor((76 - headerText.length) / 2));
        html += '    ║' + ' '.repeat(headerPadding) + headerText + ' '.repeat(76 - headerPadding - headerText.length) + '║\n';
        html += '    ╠══╦══════════╦══════════╦══════════╦══════════╦══════════╦════════════╦═════╣\n';
        html += '    ║EE║ 1   3   5║   7   9  ║11  13  15║  17  19  ║21  23  25║  27  29  31║ ges ║\n';
        html += '    ║  ║   2   4  ║ 6   8  10║  12  14  ║16  18  20║  22  24  ║26  28  30  ║     ║\n';
        html += '    ╠══╬══════════╬══════════╬══════════╬══════════╬══════════╬════════════╬═════╣\n';
        
        // Data rows
        let rowCount = 0;
        for (const eeRow of eeData) {
            const ee = eeRow.ee.toString().padStart(2, '0');
            html += '    ║' + ee + '║';
            
            // Days 1-31 in groups of 5
            for (let day = 1; day <= 31; day++) {
                const count = eeRow.days[day] || 0;
                const cellValue = count > 0 ? count.toString().padStart(2) : '  ';
                html += cellValue;
                
                // Add column separator after every 5 days
                if (day % 5 === 0 && day !== 30) {
                    html += '║';
                }
            }
            html += '║';
            
            // Total column
            html += eeRow.total.toString().padStart(4) + ' ║\n';
            
            rowCount++;
            
            // Add separator after each EE row, except:
            // - After the last row
            // - Between EE 5, 6, 7 (keep them grouped)
            const currentEE = eeRow.ee;
            const isLast = rowCount >= eeData.length;
            const isBeforeGroup567 = currentEE === 5 || currentEE === 6;
            
            if (!isLast && !isBeforeGroup567) {
                html += '    ╠══╬══════════╬══════════╬══════════╬══════════╬══════════╬════════════╬═════╣\n';
            }
        }
        
        // Daily totals row
        html += '    ╠══╩══════════╩══════════╩══════════╩══════════╩══════════╩════════════╩═════╣\n';
        html += '    ║  ║';
        for (let day = 1; day <= 31; day++) {
            const count = dailyTotals[day] || 0;
            const cellValue = count > 0 ? count.toString().padStart(2) : '  ';
            html += cellValue;
            
            if (day % 5 === 0 && day !== 30) {
                html += '║';
            }
        }
        html += '║';
        html += grandTotal.toString().padStart(4) + ' ║\n';
        html += '    ╚' + '═'.repeat(76) + '╝\n\n';
        
        return html;
    }

    // Render rare halos table (EE > 12)
    function renderRareHalos(rareHalos, monthName, year) {
        let html = '';
        
        // Table header
        html += '    ╔' + '═'.repeat(77) + '╗\n';
        const headerText = i18n.monthly_stats?.rare_halos;
        const headerPadding = Math.max(0, Math.floor((77 - headerText.length) / 2));
        html += '    ║' + ' '.repeat(headerPadding) + headerText + ' '.repeat(77 - headerPadding - headerText.length) + '║\n';
        
        // Check if there are any rare halos
        if (!rareHalos || rareHalos.length === 0) {
            // No rare halos - show message
            html += '    ╠' + '═'.repeat(77) + '╣\n';
            const noneText = (i18n.monthly_stats?.rare_halos_none).replace('{month}', monthName);
            const nonePadding = Math.max(0, Math.floor((77 - noneText.length) / 2));
            html += '    ║' + ' '.repeat(nonePadding) + noneText + ' '.repeat(77 - nonePadding - noneText.length) + '║\n';
            html += '    ╚' + '═'.repeat(77) + '╝\n\n';
            return html;
        }
        
        // Column header
        html += '    ╠════════════╦════════════╦════════════╦════════════╦════════════╦════════════╣\n';
        html += '    ║ TT EE KKGG ║ TT EE KKGG ║ TT EE KKGG ║ TT EE KKGG ║ TT EE KKGG ║ TT EE KKGG ║\n';
        html += '    ╠════════════╬════════════╬════════════╬════════════╬════════════╬════════════╣\n';
        
        // Distribute all halos across 6 columns sequentially
        // Insert empty row when day changes
        const itemsPerCol = Math.ceil(rareHalos.length / 6);
        const maxRows = itemsPerCol;
        
        let lastDay = null;
        let itemIndex = 0;
        let displayedItems = [];
        
        // Build array with empty slots for day boundaries
        for (const halo of rareHalos) {
            if (lastDay !== null && halo.tt !== lastDay) {
                // Day changed - insert empty slot
                displayedItems.push(null);
            }
            displayedItems.push(halo);
            lastDay = halo.tt;
        }
        
        // Recalculate rows based on items + empty slots
        const totalItems = displayedItems.length;
        const itemsPerColumn = Math.ceil(totalItems / 6);
        
        for (let row = 0; row < itemsPerColumn; row++) {
            html += '    ║';
            for (let col = 0; col < 6; col++) {
                const idx = col * itemsPerColumn + row;
                if (idx < displayedItems.length && displayedItems[idx] !== null) {
                    const h = displayedItems[idx];
                    const ttStr = String(h.tt).padStart(2, ' ');
                    const eeStr = String(h.ee).padStart(2, '0');
                    html += ` ${ttStr} ${eeStr} ${h.kk}${h.gg} ║`;
                } else {
                    html += '            ║';
                }
            }
            html += '\n';
        }
        
        html += '    ╚════════════╩════════════╩════════════╩════════════╩════════════╩════════════╝\n\n';
        
        return html;
    }

    // Render activity table (real and relative) - split into two tables
    function renderActivityTable(activityReal, activityRelative, activityTotals, monthName, year) {
        let html = '';
        
        // Table header
        html += '╔' + '═'.repeat(86) + '╗\n';
        const headerText = `${i18n.monthly_stats?.activity_title} ${monthName} ${year}`;
        const headerPadding = Math.max(0, Math.floor((86 - headerText.length) / 2));
        html += '║' + ' '.repeat(headerPadding) + headerText + ' '.repeat(86 - headerPadding - headerText.length) + '║\n';
        html += '╠═════╦════════════════════════╦════════════════════════╦════════════════════════╦═════╣\n';
        
        // First table: Days 1-16
        html += '║ Tag ║  1.   2.   3.   4.   5.║  6.   7.   8.   9.  10.║ 11.  12.  13.  14.  15.║ 16. ║\n';
        html += '╠═════╬════════════════════════╬════════════════════════╬════════════════════════╬═════╣\n';
        
        // Real activity row (days 1-16)
        html += '║ real║';
        for (let d = 1; d <= 16; d++) {
            const val = activityReal[d] || 0;
            const valStr = val.toFixed(1);
            html += valStr.padStart(4, ' ');
            if (d % 5 === 0) {
                html += '║';
            } else if (d === 16) {
                html += ' ║';
            } else {
                html += ' ';
            }
        }
        html += '\n';
        
        // Separator
        html += '╠═════╬════════════════════════╬════════════════════════╬════════════════════════╬═════╣\n';
        
        // Relative activity row (days 1-16)
        html += '║ rel.║';
        for (let d = 1; d <= 16; d++) {
            const val = activityRelative[d] || 0;
            const valStr = val.toFixed(1);
            html += valStr.padStart(4, ' ');
            if (d % 5 === 0) {
                html += '║';
            } else if (d === 16) {
                html += ' ║';
            } else {
                html += ' ';
            }
        }
        html += '\n';
        html += '╚═════╩════════════════════════╩════════════════════════╩════════════════════════╩═════╝\n';
        
        // Second table: Days 17-31 with total
        html += '╔═════╦═══════════════════╦════════════════════════╦════════════════════════╦════╦═════╗\n';
        html += '║ Tag ║ 17.  18.  19.  20.║ 21.  22.  23.  24.  25.║ 26.  27.  28.  29.  30.║ 31.║ ges ║\n';
        html += '╠═════╬═══════════════════╬════════════════════════╬════════════════════════╬════╬═════╣\n';
        
        // Real activity row (days 17-31)
        html += '║ real║';
        for (let d = 17; d <= 31; d++) {
            const val = activityReal[d] || 0;
            const valStr = val.toFixed(1);
            html += valStr.padStart(4, ' ');
            if (d % 5 === 0) {
                html += '║';
            } else if (d === 31) {
                html += '║';
            } else {
                html += ' ';
            }
        }
        const totalRealStr = (activityTotals.real || 0).toFixed(1);
        html += totalRealStr.padStart(5, ' ') + '║\n';
        
        // Separator
        html += '╠═════╬═══════════════════╬════════════════════════╬════════════════════════╬════╬═════╣\n';
        
        // Relative activity row (days 17-31)
        html += '║ rel.║';
        for (let d = 17; d <= 31; d++) {
            const val = activityRelative[d] || 0;
            const valStr = val.toFixed(1);
            html += valStr.padStart(4, ' ');
            if (d % 5 === 0) {
                html += '║';
            } else if (d === 31) {
                html += '║';
            } else {
                html += ' ';
            }
        }
        const totalRelStr = (activityTotals.relative || 0).toFixed(1);
        html += totalRelStr.padStart(5, ' ') + '║\n';
        
        html += '╚═════╩═══════════════════╩════════════════════════╩════════════════════════╩════╩═════╝\n\n';
        
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
    
    // Enter key support
    monthSelect.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilter();
        }
    });

    yearSelect.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilter();
        }
    });
    
    // Enter key support when filter dialog is visible
    const filterEnterKeyHandler = (e) => {
        if (e.key === 'Enter' && filterDialog.classList.contains('show')) {
            e.preventDefault();
            applyFilter();
        }
    };
    
    // ESC key support - close monthly statistics and return to main
    const escKeyHandler = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            window.location.href = '/';
        }
    };
    
    // Remove any existing handlers first to avoid duplicates
    document.removeEventListener('keypress', filterEnterKeyHandler);
    document.addEventListener('keypress', filterEnterKeyHandler);
    document.removeEventListener('keydown', escKeyHandler);
    document.addEventListener('keydown', escKeyHandler);
    
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
            btnStatsSave.onclick = async () => {
                if (!currentStatsData) return;
                
                const data = currentStatsData;
                const monthShort = i18n.months_short?.[data.mm] || String(data.mm).padStart(2, '0');
                const jjPadded = String(data.jj).padStart(2, '0');
                
                // Check output mode
                const modeResponse = await fetch('/api/config/outputmode');
                const modeData = await modeResponse.json();
                const outputMode = modeData.mode || 'P';
                
                let content, mimeType, filename;
                
                if (outputMode === 'H') {
                    // HTML-Tabellen mode: save as CSV with table data
                    filename = `${monthShort.toLowerCase()}19${jjPadded}.csv`;
                    content = generateStatsCSV(data);
                    mimeType = 'text/csv;charset=utf-8';
                } else {
                    // Pseudografik mode: save as TXT with formatted statistics
                    filename = `${monthShort.toLowerCase()}19${jjPadded}.txt`;
                    content = generateStatsText();
                    mimeType = 'text/plain;charset=utf-8';
                }
                
                const blob = new Blob([content], { type: mimeType });
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
        
        // Chart button
        const btnStatsChart = document.getElementById('btn-stats-chart');
        if (btnStatsChart) {
            btnStatsChart.onclick = () => {
                if (!currentStatsData) return;
                showActivityChart(currentStatsData);
            };
        }
    }
    
    // Show activity chart
    function showActivityChart(data) {
        const months = i18n.months || {};
        const monthName = months[data.mm] || months[data.mm.toString()];
        const year = data.jj >= 50 ? `19${data.jj.toString().padStart(2, '0')}` : 
                     `20${data.jj.toString().padStart(2, '0')}`;
        
        // Set printable chart title (shown in the chart)
        const chartPrintableTitle = document.getElementById('chart-printable-title');
        if (chartPrintableTitle) {
            chartPrintableTitle.textContent = `Haloaktivität im ${monthName} ${year}`;
        }
        
        // Set chart subtitle
        const chartSubtitle = document.getElementById('chart-subtitle');
        if (chartSubtitle) {
            const observationCount = data.activity_observation_count || 0;
            chartSubtitle.textContent = `berechnet aus ${observationCount} Einzelbeobachtungen`;
        }
        
        // Prepare chart data - days 1-31
        const days = Array.from({length: 31}, (_, i) => i + 1);
        const realData = days.map(d => data.activity_real?.[d] || 0);
        const relativeData = days.map(d => data.activity_relative?.[d] || 0);
        
        // Create chart
        const ctx = document.getElementById('activity-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.activityChart) {
            window.activityChart.destroy();
        }
        
        window.activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: i18n.monthly_stats?.activity_real,
                        data: realData,
                        borderColor: '#dc3545',  // Red
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,  // Spline smoothing
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#dc3545'
                    },
                    {
                        label: i18n.monthly_stats?.activity_relative,
                        data: relativeData,
                        borderColor: '#28a745',  // Green
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,  // Spline smoothing
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#28a745'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 12 },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: i18n.monthly_stats?.x_axis,
                            font: { size: 12, weight: 'bold' }
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: i18n.monthly_stats?.y_axis,
                            font: { size: 12, weight: 'bold' }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Show chart modal
        const chartModalElement = document.getElementById('chart-modal');
        const chartModal = new bootstrap.Modal(chartModalElement);
        
        // Prevent ESC key from propagating to parent modal
        chartModalElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
            }
        });
        
        // Set focus to chart modal after it's shown to capture ESC key
        chartModalElement.addEventListener('shown.bs.modal', () => {
            chartModalElement.focus();
        }, { once: true });
        
        chartModal.show();
        
        // Wire up chart print button
        const btnChartPrint = document.getElementById('btn-chart-print');
        if (btnChartPrint) {
            btnChartPrint.onclick = () => {
                // Hide stats content and results modal for printing
                const statsContent = document.getElementById('stats-content');
                const resultsModal = document.getElementById('results-modal');
                const resultsBackdrop = document.querySelector('.modal-backdrop.show');
                
                // Store original display states
                const originalStatsDisplay = statsContent?.style.display;
                const originalResultsDisplay = resultsModal?.style.display;
                const originalBackdropDisplay = resultsBackdrop?.style.display;
                
                if (statsContent) statsContent.style.display = 'none';
                if (resultsModal) resultsModal.style.display = 'none';
                if (resultsBackdrop) resultsBackdrop.style.display = 'none';
                
                // Print
                window.print();
                
                // Restore visibility after print dialog closes
                setTimeout(() => {
                    if (statsContent) statsContent.style.display = originalStatsDisplay || '';
                    if (resultsModal) resultsModal.style.display = originalResultsDisplay || '';
                    if (resultsBackdrop) resultsBackdrop.style.display = originalBackdropDisplay || '';
                }, 100);
            };
        }
        
        // Wire up chart save button
        const btnChartSave = document.getElementById('btn-chart-save');
        if (btnChartSave) {
            btnChartSave.onclick = () => {
                saveChart();
            };
        }
        
        // Wire up chart close button to return to stats
        const btnChartClose = document.getElementById('btn-chart-close');
        if (btnChartClose) {
            btnChartClose.onclick = () => {
                const chartModal = bootstrap.Modal.getInstance(document.getElementById('chart-modal'));
                if (chartModal) chartModal.hide();
                // Results modal will still be open behind
            };
        }
    }
    
    // Generate plain text statistics content for save and print
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
        
        // Table 1: Observer Overview (reuse rendering function)
        if (data.observer_overview && data.observer_overview.length > 0) {
            text += renderObserverOverview(data.observer_overview, monthName, year);
        }
        
        // Table 2: EE Overview (reuse rendering function)
        if (data.ee_overview && data.ee_overview.length > 0) {
            text += renderEEOverview(data.ee_overview, data.daily_totals || {}, data.grand_total || 0, monthName, year);
        }
        
        // Table 3: Rare Halos (reuse rendering function)
        if (data.rare_halos && data.rare_halos.length > 0) {
            text += renderRareHalos(data.rare_halos, monthName, year);
        }
        
        // Table 4: Activity (reuse rendering function)
        if (data.activity_real && data.activity_relative && data.activity_totals) {
            text += renderActivityTable(data.activity_real, data.activity_relative, data.activity_totals, monthName, year);
        }
        
        return text;
    }

    // Save chart as PNG
    function saveChart() {
        if (!currentStatsData) return;
        
        const data = currentStatsData;
        const monthShort = i18n.months_short?.[data.mm] || String(data.mm).padStart(2, '0');
        const jjPadded = String(data.jj).padStart(2, '0');
        const filename = `${monthShort.toLowerCase()}19${jjPadded}.png`;
        
        const canvas = document.getElementById('activity-chart');
        if (!canvas) return;
        
        // Create a new canvas with white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the original canvas on top
        ctx.drawImage(canvas, 0, 0);
        
        // Convert canvas to blob and download
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    // Generate CSV from statistics data
    function generateStatsCSV(data) {
        let csv = '';
        const months = i18n.months || {};
        const monthName = months[data.mm] || months[data.mm.toString()];
        const year = data.jj >= 50 ? `19${data.jj.toString().padStart(2, '0')}` : 
                     `20${data.jj.toString().padStart(2, '0')}`;
        
        // Table 1: Observer Overview
        if (data.observer_overview && data.observer_overview.length > 0) {
            csv += `"${i18n.monthly_stats?.observer_overview} ${monthName} ${year}"\n`;
            csv += 'KKGG';
            for (let d = 1; d <= 31; d++) {
                csv += ',' + d;
            }
            csv += ',EE(Sonne),Tage(Sonne),Tage(Mond),Tage(gesamt)\n';
            
            for (const obs of data.observer_overview) {
                const kk = obs.kk.toString().padStart(2, '0');
                const gg = obs.region === 39 ? '//' : obs.region.toString().padStart(2, '0');
                csv += kk + gg;
                
                for (let day = 1; day <= 31; day++) {
                    const dayData = obs.days[day];
                    let cellValue = '';
                    if (dayData) {
                        const solar = dayData.solar || 0;
                        const lunar = dayData.lunar || false;
                        if (solar > 0 && lunar) cellValue = '_' + solar;
                        else if (solar > 0) cellValue = solar;
                        else if (lunar) cellValue = 'X';
                    }
                    csv += ',' + cellValue;
                }
                
                csv += ',' + obs.total_solar + ',' + obs.days_solar + ',' + obs.days_lunar + ',' + obs.total_days + '\n';
            }
            csv += '\n';
        }
        
        // Table 2: EE Overview
        if (data.ee_overview && data.ee_overview.length > 0) {
            csv += `"${i18n.monthly_stats?.ee_overview} ${monthName} ${year}"\n`;
            csv += 'EE';
            for (let d = 1; d <= 31; d++) {
                csv += ',' + d;
            }
            csv += ',gesamt\n';
            
            for (const eeRow of data.ee_overview) {
                csv += eeRow.ee.toString().padStart(2, '0');
                
                for (let day = 1; day <= 31; day++) {
                    const count = eeRow.days[day] || 0;
                    csv += ',' + (count > 0 ? count : '');
                }
                
                csv += ',' + eeRow.total + '\n';
            }
            
            // Daily totals
            csv += 'Summe';
            for (let day = 1; day <= 31; day++) {
                const count = (data.daily_totals && data.daily_totals[day]) || 0;
                csv += ',' + (count > 0 ? count : '');
            }
            csv += ',' + (data.grand_total || 0) + '\n';
            csv += '\n';
        }
        
        // Table 3: Rare Halos
        if (data.rare_halos && data.rare_halos.length > 0) {
            csv += `"${i18n.monthly_stats?.rare_halos}"\n`;
            csv += 'TT,EE,KK,GG\n';
            for (const halo of data.rare_halos) {
                const tt = halo.tt;
                const ee = halo.ee.toString().padStart(2, '0');
                const kk = halo.kk.toString().padStart(2, '0');
                const gg = halo.gg === 39 ? '//' : halo.gg.toString().padStart(2, '0');
                csv += tt + ',' + ee + ',' + kk + ',' + gg + '\n';
            }
            csv += '\n';
        }
        
        // Table 4: Activity
        if (data.activity_real && data.activity_relative && data.activity_totals) {
            csv += `"${i18n.monthly_stats?.activity_title} ${monthName} ${year}"\n`;
            csv += 'Tag';
            for (let d = 1; d <= 31; d++) {
                csv += ',' + d;
            }
            csv += ',gesamt\n';
            
            // Real activity
            csv += 'real';
            for (let d = 1; d <= 31; d++) {
                const val = data.activity_real[d] || 0;
                csv += ',' + val.toFixed(1);
            }
            csv += ',' + (data.activity_totals.real || 0).toFixed(1) + '\n';
            
            // Relative activity
            csv += 'rel.';
            for (let d = 1; d <= 31; d++) {
                const val = data.activity_relative[d] || 0;
                csv += ',' + val.toFixed(1);
            }
            csv += ',' + (data.activity_totals.relative || 0).toFixed(1) + '\n';
        }
        
        return csv;
    }

    // Initialize
    async function initialize() {
        await loadI18n();
        
        // Populate year dropdown
        populateYears();
        
        // Check if data is already loaded on the server
        const dataLoaded = await checkDataLoaded();
        
        if (dataLoaded) {
            // Load date default and pre-fill month/year dropdowns
            await loadDateDefault();
            
            // Show filter dialog automatically with explicit backdrop configuration
            const modal = new bootstrap.Modal(filterDialog, {
                backdrop: true,
                keyboard: false
            });
            modal.show();
            
            // Focus month select when modal is shown
            filterDialog.addEventListener('shown.bs.modal', () => {
                if (monthSelect) {
                    monthSelect.focus();
                }
            });
        }
    }

    // Setup event listeners for action buttons (OK, Print, Save)
    setupActionButtons();

    // Build Pseudografik format statistics (original implementation)
    function buildPseudografikMonthlyStats(data, monthName, year, i18n) {
        let html = '<div class="statistics-report" style="font-family: monospace; white-space: pre; font-size: 11px; color: #000000; line-height: 1;">';
        
        // Title (centered)
        const titleLine = `${i18n.monthly_stats?.title} ${monthName} ${year}`;
        const titlePadding = Math.max(0, Math.floor((86 - titleLine.length) / 2));
        html += ' '.repeat(titlePadding) + titleLine + '\n';
        html += ' '.repeat(titlePadding) + '═'.repeat(titleLine.length) + '\n\n';
        
        // Table 1: Observer Overview (Beobachterübersicht)
        if (data.observer_overview && data.observer_overview.length > 0) {
            html += renderObserverOverview(data.observer_overview, monthName, year);
        }
        
        // Table 2: EE Overview (Ergebnisübersicht Sonnenhalos)
        if (data.ee_overview && data.ee_overview.length > 0) {
            html += renderEEOverview(data.ee_overview, data.daily_totals || {}, data.grand_total || 0, monthName, year);
        }
        
        // Table 3: Rare Halos (Erscheinungen über EE 12)
        if (data.rare_halos && data.rare_halos.length > 0) {
            html += renderRareHalos(data.rare_halos, monthName, year);
        }
        
        // Table 4: Activity (Haloaktivität)
        if (data.activity_real && data.activity_relative && data.activity_totals) {
            html += renderActivityTable(data.activity_real, data.activity_relative, data.activity_totals, monthName, year);
        }
        
        html += '</div>';
        return html;
    }

    // Build HTML-Tabellen format statistics
    function buildHTMLTableMonthlyStats(data, monthName, year, i18n) {
        let html = '<div style="padding: 20px;">';
        
        // Title
        const titleLine = `${i18n.monthly_stats?.title} ${monthName} ${year}`;
        html += `<h3 style="text-align: center; font-family: Arial, sans-serif; margin-bottom: 30px;">${titleLine}</h3>`;
        
        // Table 1: Observer Overview (Beobachterübersicht)
        if (data.observer_overview && data.observer_overview.length > 0) {
            html += '<table class="table table-bordered analysis-table" style="margin-bottom: 30px;">';
            html += '<thead>';
            html += '<tr>';
            html += '<th colspan="36" style="text-align: center;">' + 
                    i18n.monthly_stats?.observer_overview + ' ' + monthName + ' ' + year + '</th>';
            html += '</tr>';
            html += '<tr>';
            html += '<th>KKGG</th>';
            for (let d = 1; d <= 31; d++) {
                html += '<th>' + d + '</th>';
            }
            html += '<th>1)</th><th>2)</th><th>3)</th><th>4)</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            for (const obs of data.observer_overview) {
                const kk = obs.kk.toString().padStart(2, '0');
                const gg = obs.region === 39 ? '//' : obs.region.toString().padStart(2, '0');
                
                html += '<tr>';
                html += '<td style="font-weight: bold;">' + kk + gg + '</td>';
                
                for (let day = 1; day <= 31; day++) {
                    const dayData = obs.days[day];
                    let cellValue = '';
                    if (dayData) {
                        const solar = dayData.solar || 0;
                        const lunar = dayData.lunar || false;
                        if (solar > 0 && lunar) cellValue = '<u>' + solar + '</u>';
                        else if (solar > 0) cellValue = solar;
                        else if (lunar) cellValue = '<u>X</u>';
                    }
                    html += '<td style="text-align: center;">' + cellValue + '</td>';
                }
                
                html += '<td style="text-align: right;">' + obs.total_solar + '</td>';
                html += '<td style="text-align: right;">' + obs.days_solar + '</td>';
                html += '<td style="text-align: right;">' + obs.days_lunar + '</td>';
                html += '<td style="text-align: right;">' + obs.total_days + '</td>';
                html += '</tr>';
            }
            
            html += '</tbody>';
            html += '<tfoot>';
            html += '<tr><td colspan="36" style="text-align: left; font-size: 90%;">';
            html += '1) = EE (Sonne) &nbsp; 2) = Tage (Sonne) &nbsp; 3) = Tage (Mond) &nbsp; 4) = Tage (gesamt)';
            html += '</td></tr>';
            html += '</tfoot>';
            html += '</table>';
        }
        
        // Table 2: EE Overview (Ergebnisübersicht Sonnenhalos)
        if (data.ee_overview && data.ee_overview.length > 0) {
            html += '<table class="table table-bordered analysis-table" style="margin-bottom: 30px;">';
            html += '<thead>';
            html += '<tr>';
            html += '<th colspan="33" style="text-align: center;">' + 
                    i18n.monthly_stats?.ee_overview + ' ' + monthName + ' ' + year + '</th>';
            html += '</tr>';
            html += '<tr>';
            html += '<th>EE</th>';
            for (let d = 1; d <= 31; d++) {
                html += '<th>' + d + '</th>';
            }
            html += '<th>ges</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            for (const eeRow of data.ee_overview) {
                html += '<tr>';
                html += '<td style="font-weight: bold;">' + eeRow.ee.toString().padStart(2, '0') + '</td>';
                
                for (let day = 1; day <= 31; day++) {
                    const count = eeRow.days[day] || 0;
                    html += '<td style="text-align: center;">' + (count > 0 ? count : '') + '</td>';
                }
                
                html += '<td style="text-align: right; font-weight: bold;">' + eeRow.total + '</td>';
                html += '</tr>';
            }
            
            // Daily totals row
            html += '<tr style="font-weight: bold; border-top: 2px solid #000;">';
            html += '<td>Σ</td>';
            for (let day = 1; day <= 31; day++) {
                const count = (data.daily_totals && data.daily_totals[day]) || 0;
                html += '<td style="text-align: center;">' + (count > 0 ? count : '') + '</td>';
            }
            html += '<td style="text-align: right;">' + (data.grand_total || 0) + '</td>';
            html += '</tr>';
            
            html += '</tbody>';
            html += '</table>';
        }
        
        // Table 3: Rare Halos (Erscheinungen über EE 12)
        if (data.rare_halos && data.rare_halos.length > 0) {
            html += '<table class="table table-bordered analysis-table" style="margin-bottom: 30px;">';
            html += '<thead>';
            html += '<tr>';
            html += '<th colspan="6" style="text-align: center;">' + 
                    i18n.monthly_stats?.rare_halos + '</th>';
            html += '</tr>';
            html += '<tr>';
            html += '<th style="text-align: center;">TT EE KKGG</th>';
            html += '<th style="text-align: center;">TT EE KKGG</th>';
            html += '<th style="text-align: center;">TT EE KKGG</th>';
            html += '<th style="text-align: center;">TT EE KKGG</th>';
            html += '<th style="text-align: center;">TT EE KKGG</th>';
            html += '<th style="text-align: center;">TT EE KKGG</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            // Distribute halos across 6 columns
            const itemsPerColumn = Math.ceil(data.rare_halos.length / 6);
            
            for (let row = 0; row < itemsPerColumn; row++) {
                html += '<tr>';
                for (let col = 0; col < 6; col++) {
                    const idx = col * itemsPerColumn + row;
                    if (idx < data.rare_halos.length) {
                        const h = data.rare_halos[idx];
                        const ttStr = String(h.tt).padStart(2, ' ');
                        const eeStr = String(h.ee).padStart(2, '0');
                        const kkStr = String(h.kk).padStart(2, '0');
                        const ggStr = h.gg === 39 ? '//' : String(h.gg).padStart(2, '0');
                        html += '<td style="text-align: center; font-family: monospace;">' + 
                                ttStr + ' ' + eeStr + ' ' + kkStr + ggStr + '</td>';
                    } else {
                        html += '<td></td>';
                    }
                }
                html += '</tr>';
            }
            
            html += '</tbody>';
            html += '</table>';
        } else {
            // No rare halos message
            html += '<div style="padding: 20px; text-align: center; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 30px;">';
            const noneText = (i18n.monthly_stats?.rare_halos_none || '').replace('{month}', monthName);
            html += '<p style="margin: 0;">' + noneText + '</p>';
            html += '</div>';
        }
        
        // Table 4: Activity (Haloaktivität) - all 31 days in one table
        if (data.activity_real && data.activity_relative && data.activity_totals) {
            html += '<table class="table table-bordered analysis-table" style="margin-bottom: 30px;">';
            html += '<thead>';
            html += '<tr>';
            html += '<th colspan="33" style="text-align: center;">' + 
                    i18n.monthly_stats?.activity_title + ' ' + monthName + ' ' + year + '</th>';
            html += '</tr>';
            html += '<tr>';
            html += '<th>Tag</th>';
            for (let d = 1; d <= 31; d++) {
                html += '<th>' + d + '</th>';
            }
            html += '<th>ges</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            // Real activity row
            html += '<tr>';
            html += '<td style="font-weight: bold;">real</td>';
            for (let d = 1; d <= 31; d++) {
                const val = data.activity_real[d] || 0;
                html += '<td style="text-align: center;">' + val.toFixed(1) + '</td>';
            }
            html += '<td style="text-align: right; font-weight: bold;">' + 
                    (data.activity_totals.real || 0).toFixed(1) + '</td>';
            html += '</tr>';
            
            // Relative activity row
            html += '<tr>';
            html += '<td style="font-weight: bold;">rel.</td>';
            for (let d = 1; d <= 31; d++) {
                const val = data.activity_relative[d] || 0;
                html += '<td style="text-align: center;">' + val.toFixed(1) + '</td>';
            }
            html += '<td style="text-align: right; font-weight: bold;">' + 
                    (data.activity_totals.relative || 0).toFixed(1) + '</td>';
            html += '</tr>';
            
            html += '</tbody>';
            html += '</table>';
        }
        
        html += '</div>';
        return html;
    }

    initialize();
});
