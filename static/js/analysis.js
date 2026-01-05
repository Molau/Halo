// Analysis (Auswertung) functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Analysis page loaded');

    let i18n = null;
    let observers = [];

    // Timezone array from H_TYPES.PAS - timezone offsets by region (1-38)
    const Zeitzone = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        2, 10, 0, 0, 1, 1, 0, 0, 0, 0, 0, -1, 0, 0, 0,
        1, -1, 0, -8, 9
    ];

    // Modal elements
    const paramDialog = document.getElementById('param-dialog');

    // Parameter dialog elements
    const param1Select = document.getElementById('param1-select');
    const param2Select = document.getElementById('param2-select');
    const filter1Select = document.getElementById('filter1-select');
    const filter2Select = document.getElementById('filter2-select');
    const btnCancelParam = document.getElementById('btn-cancel-param');
    const btnApplyParam = document.getElementById('btn-apply-param');

    // Range elements for first parameter
    const param1RangeDiv = document.getElementById('param1-range');
    const param1FromSelect = document.getElementById('param1-from');
    const param1ToSelect = document.getElementById('param1-to');

    // Special day parameter elements
    const param1DayFieldsDiv = document.getElementById('param1-day-fields');
    const param1MonthSelect = document.getElementById('param1-month');
    const param1YearSelect = document.getElementById('param1-year');
    const param1DayFromSelect = document.getElementById('param1-day-from');
    const param1DayToSelect = document.getElementById('param1-day-to');

    // Special time parameter elements
    const param1TimeFieldsDiv = document.getElementById('param1-time-fields');
    const param1TimezoneRadios = document.querySelectorAll('input[name="param1-timezone"]');

    // Special solar altitude parameter elements
    const param1ShFieldsDiv = document.getElementById('param1-sh-fields');
    const param1ShTimeRadios = document.querySelectorAll('input[name="param1-sh-time"]');

    // Special halo type parameter elements
    const param1EeFieldsDiv = document.getElementById('param1-ee-fields');
    const param1EeSplitRadios = document.querySelectorAll('input[name="param1-ee-split"]');

    // Special cirrus type parameter elements
    const param1CFieldsDiv = document.getElementById('param1-c-fields');
    const param1CSplitRadios = document.querySelectorAll('input[name="param1-c-split"]');

    // Special duration parameter elements
    const param1DdFieldsDiv = document.getElementById('param1-dd-fields');
    const param1DdIncompleteRadios = document.querySelectorAll('input[name="param1-dd-incomplete"]');

    // Range elements for second parameter
    const param2RangeDiv = document.getElementById('param2-range');
    const param2FromSelect = document.getElementById('param2-from');
    const param2ToSelect = document.getElementById('param2-to');

    // Special day parameter elements for param2
    const param2DayFieldsDiv = document.getElementById('param2-day-fields');
    const param2MonthSelect = document.getElementById('param2-month');
    const param2YearSelect = document.getElementById('param2-year');
    const param2DayFromSelect = document.getElementById('param2-day-from');
    const param2DayToSelect = document.getElementById('param2-day-to');

    // Special time parameter elements for param2
    const param2TimeFieldsDiv = document.getElementById('param2-time-fields');
    const param2TimezoneRadios = document.querySelectorAll('input[name="param2-timezone"]');

    // Special solar altitude parameter elements for param2
    const param2ShFieldsDiv = document.getElementById('param2-sh-fields');
    const param2ShTimeRadios = document.querySelectorAll('input[name="param2-sh-time"]');

    // Special halo type parameter elements for param2
    const param2EeFieldsDiv = document.getElementById('param2-ee-fields');
    const param2EeSplitRadios = document.querySelectorAll('input[name="param2-ee-split"]');

    // Special cirrus type parameter elements for param2
    const param2CFieldsDiv = document.getElementById('param2-c-fields');
    const param2CSplitRadios = document.querySelectorAll('input[name="param2-c-split"]');

    // Special duration parameter elements for param2
    const param2DdFieldsDiv = document.getElementById('param2-dd-fields');
    const param2DdIncompleteRadios = document.querySelectorAll('input[name="param2-dd-incomplete"]');

    // Filter1 elements (filter1Select already declared above)
    const filter1ValueDiv = document.getElementById('filter1-value');
    const filter1ValueSelect = document.getElementById('filter1-value-select');
    const filter1DayFieldsDiv = document.getElementById('filter1-day-fields');
    const filter1MonthSelect = document.getElementById('filter1-month-select');
    const filter1YearSelect = document.getElementById('filter1-year-select');
    const filter1TimeFieldsDiv = document.getElementById('filter1-time-fields');
    const filter1TimezoneRadios = document.querySelectorAll('input[name="filter1-timezone"]');
    const filter1ShFieldsDiv = document.getElementById('filter1-sh-fields');
    const filter1ShTimeRadios = document.querySelectorAll('input[name="filter1-sh-time"]');
    const filter1EeFieldsDiv = document.getElementById('filter1-ee-fields');
    const filter1EeSplitRadios = document.querySelectorAll('input[name="filter1-ee-split"]');
    const filter1CFieldsDiv = document.getElementById('filter1-c-fields');
    const filter1CSplitRadios = document.querySelectorAll('input[name="filter1-c-split"]');
    const filter1DdFieldsDiv = document.getElementById('filter1-dd-fields');
    const filter1DdIncompleteRadios = document.querySelectorAll('input[name="filter1-dd-incomplete"]');

    // Filter2 elements (filter2Select already declared above)
    const filter2ValueDiv = document.getElementById('filter2-value');
    const filter2ValueSelect = document.getElementById('filter2-value-select');
    const filter2DayFieldsDiv = document.getElementById('filter2-day-fields');
    const filter2MonthSelect = document.getElementById('filter2-month-select');
    const filter2YearSelect = document.getElementById('filter2-year-select');
    const filter2TimeFieldsDiv = document.getElementById('filter2-time-fields');
    const filter2TimezoneRadios = document.querySelectorAll('input[name="filter2-timezone"]');
    const filter2ShFieldsDiv = document.getElementById('filter2-sh-fields');
    const filter2ShTimeRadios = document.querySelectorAll('input[name="filter2-sh-time"]');
    const filter2EeFieldsDiv = document.getElementById('filter2-ee-fields');
    const filter2EeSplitRadios = document.querySelectorAll('input[name="filter2-ee-split"]');
    const filter2CFieldsDiv = document.getElementById('filter2-c-fields');
    const filter2CSplitRadios = document.querySelectorAll('input[name="filter2-c-split"]');
    const filter2DdFieldsDiv = document.getElementById('filter2-dd-fields');
    const filter2DdIncompleteRadios = document.querySelectorAll('input[name="filter2-dd-incomplete"]');

    // Load i18n strings
    async function loadI18n() {
        try {
            const langResponse = await fetch('/api/language');
            const langData = await langResponse.json();
            const lang = langData.language || 'de';

            const i18nResponse = await fetch(`/api/i18n/${lang}`);
            i18n = await i18nResponse.json();
            console.log('i18n loaded:', i18n);
        } catch (error) {
            console.error('Error loading i18n:', error);
            i18n = { analysis_dialog: {}, common: {} };
        }
    }

    // Load observers
    async function loadObservers() {
        try {
            const response = await fetch('/api/observers/list');
            const data = await response.json();
            observers = data.observers || [];
            console.log('Observers loaded:', observers.length);
        } catch (error) {
            console.error('Error loading observers:', error);
            observers = [];
        }
    }

    // Show warning modal (same style as other pages)
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

    // Populate parameter dropdowns with all available parameters
    function populateParameterSelects() {
        const params = [
            { code: 'JJ', name: i18n.analysis_dialog.param_names.JJ },
            { code: 'MM', name: i18n.analysis_dialog.param_names.MM },
            { code: 'TT', name: i18n.analysis_dialog.param_names.TT },
            { code: 'ZZ', name: i18n.analysis_dialog.param_names.ZZ },
            { code: 'SH', name: i18n.analysis_dialog.param_names.SH },
            { code: 'KK', name: i18n.analysis_dialog.param_names.KK },
            { code: 'GG', name: i18n.analysis_dialog.param_names.GG },
            { code: 'O', name: i18n.analysis_dialog.param_names.O },
            { code: 'f', name: i18n.analysis_dialog.param_names.f },
            { code: 'C', name: i18n.analysis_dialog.param_names.C },
            { code: 'd', name: i18n.analysis_dialog.param_names.d },
            { code: 'EE', name: i18n.analysis_dialog.param_names.EE },
            { code: 'DD', name: i18n.analysis_dialog.param_names.DD },
            { code: 'H', name: i18n.analysis_dialog.param_names.H },
            { code: 'F', name: i18n.analysis_dialog.param_names.F },
            { code: 'V', name: i18n.analysis_dialog.param_names.V },
            { code: 'zz', name: i18n.analysis_dialog.param_names.zz },
            { code: 'HO_HU', name: i18n.analysis_dialog.param_names.HO_HU },
            { code: 'SE', name: i18n.analysis_dialog.param_names.SE }
        ];

        // Populate all select dropdowns
        [param1Select, param2Select, filter1Select, filter2Select].forEach(select => {
            // Keep the first option (placeholder/empty option)
            const firstOption = select.firstElementChild;
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            params.forEach(param => {
                const option = document.createElement('option');
                option.value = param.code;
                option.textContent = param.name;
                select.appendChild(option);
            });
        });
    }

    // Update available options based on selections (prevent duplicates)
    function updateAvailableOptions() {
        const selectedValues = [
            param1Select.value,
            param2Select.value,
            filter1Select.value,
            filter2Select.value
        ].filter(v => v !== '');

        // Update param2 options (exclude param1)
        Array.from(param2Select.options).forEach(option => {
            if (option.value === '') return; // Keep empty option
            option.disabled = selectedValues.includes(option.value) && option.value !== param2Select.value;
        });

        // Update filter1 options (exclude param1, param2)
        Array.from(filter1Select.options).forEach(option => {
            if (option.value === '') return;
            option.disabled = selectedValues.includes(option.value) && option.value !== filter1Select.value;
        });

        // Update filter2 options (exclude param1, param2, filter1)
        Array.from(filter2Select.options).forEach(option => {
            if (option.value === '') return;
            option.disabled = selectedValues.includes(option.value) && option.value !== filter2Select.value;
        });
    }

    // Get range values for a parameter
    function getParameterRange(paramCode) {
        // Helper function to get month name from either i18n object or array
        function getMonthName(monthNum) {
            if (i18n.months && typeof i18n.months === 'object') {
                // i18n.months is an object with string keys: {"1": "Januar", "2": "Februar", ...}
                return i18n.months[String(monthNum)] || '';
            }
            // Fallback to array (0-indexed)
            const monthArray = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
            return monthArray[monthNum - 1] || '';
        }
        
        switch (paramCode) {
            case 'JJ':
                const years = [];
                for (let i = 1950; i <= 2049; i++) {
                    years.push({ value: i, display: String(i) });
                }
                return years;
            
            case 'MM':
                // Format: "01 - Januar", "02 - Februar", etc.
                const months = [];
                for (let i = 1; i <= 12; i++) {
                    const monthName = getMonthName(i);
                    months.push({ value: i, display: `${String(i).padStart(2, '0')} - ${monthName}` });
                }
                return months;
            
            case 'TT':
                const days = [];
                for (let i = 1; i <= 31; i++) {
                    days.push({ value: i, display: String(i).padStart(2, '0') });
                }
                return days;
            
            case 'ZZ':
                const hours = [];
                for (let i = 0; i <= 23; i++) {
                    hours.push({ value: i, display: String(i).padStart(2, '0') });
                }
                return hours;
            
            case 'SH':
                // Start at -10° instead of -90°
                const altitudes = [];
                for (let i = -10; i <= 90; i += 2) {
                    altitudes.push({ value: i, display: String(i) + '°' });
                }
                return altitudes;
            
            case 'KK':
                // Format: "44 - Hans Mustermann"
                return observers.map(obs => ({
                    value: obs.KK,
                    display: `${String(obs.KK).padStart(2, '0')} - ${obs.VName || ''} ${obs.NName || ''}`
                }));
            
            case 'GG':
                // Use exact region list from observation form
                const regionNumbers = [1,2,3,4,5,6,7,8,9,10,11,16,17,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39];
                return regionNumbers.map(gg => {
                    const regionName = i18n.geographic_regions?.[String(gg)] || '';
                    return { value: gg, display: `${String(gg).padStart(2, '0')} - ${regionName}` };
                });
            
            case 'O':
                const objects = [];
                for (let i = 1; i <= 5; i++) {
                    const objName = i18n.object_types?.[String(i)] || String(i);
                    objects.push({ value: i, display: `${i} - ${objName}` });
                }
                return objects;
            
            case 'f':
                // Weather front with text names
                const fronts = [];
                for (let i = 0; i <= 8; i++) {
                    const frontName = i18n.weather_front?.[String(i)] || String(i);
                    fronts.push({ value: i, display: `${i} - ${frontName}` });
                }
                return fronts;
            
            case 'C':
                // Cirrus type with text names
                const cirrus = [];
                for (let i = 0; i <= 7; i++) {
                    const cirrusName = i18n.cirrus_types?.[String(i)] || String(i);
                    cirrus.push({ value: i, display: `${i} - ${cirrusName}` });
                }
                return cirrus;
            
            case 'd':
                // Cirrus density - use exact format from observation form
                return [
                    { value: 0, display: `0 - ${i18n.cirrus_density?.['0'] || 'dünner Cirrus'}` },
                    { value: 1, display: `1 - ${i18n.cirrus_density?.['1'] || 'normaler Cirrus'}` },
                    { value: 2, display: `2 - ${i18n.cirrus_density?.['2'] || 'dichter Cirrus'}` },
                    { value: 4, display: `4 - ${i18n.cirrus_density?.['4'] || 'Reif'}` },
                    { value: 5, display: `5 - ${i18n.cirrus_density?.['5'] || 'Schneedecke'}` },
                    { value: 6, display: `6 - ${i18n.cirrus_density?.['6'] || 'Eisnebel'}` },
                    { value: 7, display: `7 - ${i18n.cirrus_density?.['7'] || 'Fallstreifen'}` }
                ];
            
            case 'EE':
                // Only halo types 1-77 and 99 (exclude 78-98)
                const haloTypes = [];
                for (let i = 1; i <= 77; i++) {
                    const haloName = i18n.halo_types?.[String(i)] || '';
                    haloTypes.push({ value: i, display: `${String(i).padStart(2, '0')} - ${haloName}` });
                }
                haloTypes.push({ value: 99, display: `99 - ${i18n.halo_types?.['99'] || 'unbekannt'}` });
                return haloTypes;
            
            case 'DD':
                // Duration: display key values 0, 10, 20, 30, etc.
                const durations = [];
                for (let i = 0; i <= 99; i += 10) {
                    const minuteText = i18n.fields?.minutes || 'Minuten';
                    durations.push({ value: i, display: `${i} ${minuteText}` });
                }
                return durations;
            
            case 'H':
                // Brightness with text values
                const brightness = [];
                for (let i = 0; i <= 3; i++) {
                    const brightName = i18n.brightness?.[String(i)] || String(i);
                    brightness.push({ value: i, display: `${i} - ${brightName}` });
                }
                return brightness;
            
            case 'F':
                // Color with text values
                const colours = [];
                for (let i = 0; i <= 5; i++) {
                    const colorName = i18n.color?.[String(i)] || String(i);
                    colours.push({ value: i, display: `${i} - ${colorName}` });
                }
                return colours;
            
            case 'V':
                // Completeness with text values
                return [
                    { value: 1, display: `1 - ${i18n.completeness?.['1'] || 'unvollständig'}` },
                    { value: 2, display: `2 - ${i18n.completeness?.['2'] || 'vollständig'}` }
                ];
            
            case 'zz':
                // Zeit bis Niederschlag (hours): 0 hours, 1 hours, etc.
                const zzTimes = [];
                for (let i = 0; i <= 99; i++) {
                    const hourText = i18n.fields?.hours || 'Stunden';
                    zzTimes.push({ value: i, display: `${i} ${hourText}` });
                }
                return zzTimes;
            
            case 'HO_HU':
                // Lichtäulenhöhe (pillar height): limited to 30 degrees
                const heights = [];
                for (let i = 0; i <= 30; i++) {
                    heights.push({ value: i, display: String(i) + '°' });
                }
                return heights;
            
            case 'SE':
                return [{ value: 0, display: 'N/A' }];
            
            default:
                return [];
        }
    }

    // Populate month and year fields for day (TT) parameter
    function populateDayFields() {
        // Populate months
        param1MonthSelect.innerHTML = '';
        const months = getParameterRange('MM');
        months.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            param1MonthSelect.appendChild(option);
        });
        
        // Populate years
        param1YearSelect.innerHTML = '';
        const years = getParameterRange('JJ');
        years.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            param1YearSelect.appendChild(option);
        });

        // Populate day range dropdowns (days 1-31)
        const days = [];
        for (let i = 1; i <= 31; i++) {
            days.push({ value: i, display: String(i) });
        }

        param1DayFromSelect.innerHTML = '';
        param1DayToSelect.innerHTML = '';
        
        days.forEach(item => {
            const fromOption = document.createElement('option');
            fromOption.value = item.value;
            fromOption.textContent = item.display;
            param1DayFromSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = item.value;
            toOption.textContent = item.display;
            param1DayToSelect.appendChild(toOption);
        });

        // Set "to" day to 31 by default (last day)
        param1DayToSelect.selectedIndex = 30; // 31st day
    }

    // Populate month and year fields for day (TT) parameter - param2
    function populateDayFields2() {
        // Populate months
        param2MonthSelect.innerHTML = '';
        const months = getParameterRange('MM');
        months.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            param2MonthSelect.appendChild(option);
        });
        
        // Populate years
        param2YearSelect.innerHTML = '';
        const years = getParameterRange('JJ');
        years.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            param2YearSelect.appendChild(option);
        });

        // Populate day range dropdowns (days 1-31)
        const days = [];
        for (let i = 1; i <= 31; i++) {
            days.push({ value: i, display: String(i) });
        }

        param2DayFromSelect.innerHTML = '';
        param2DayToSelect.innerHTML = '';
        
        days.forEach(item => {
            const fromOption = document.createElement('option');
            fromOption.value = item.value;
            fromOption.textContent = item.display;
            param2DayFromSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = item.value;
            toOption.textContent = item.display;
            param2DayToSelect.appendChild(toOption);
        });

        // Set "to" day to 31 by default (last day)
        param2DayToSelect.selectedIndex = 30; // 31st day
    }

    // Populate month and year fields for day (TT) parameter - filter1
    function populateFilter1DayFields() {
        // Populate months
        filter1MonthSelect.innerHTML = '';
        const months = getParameterRange('MM');
        months.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            filter1MonthSelect.appendChild(option);
        });
        
        // Populate years
        filter1YearSelect.innerHTML = '';
        const years = getParameterRange('JJ');
        years.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            filter1YearSelect.appendChild(option);
        });
    }

    // Populate month and year fields for day (TT) parameter - filter2
    function populateFilter2DayFields() {
        // Populate months
        filter2MonthSelect.innerHTML = '';
        const months = getParameterRange('MM');
        months.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            filter2MonthSelect.appendChild(option);
        });
        
        // Populate years
        filter2YearSelect.innerHTML = '';
        const years = getParameterRange('JJ');
        years.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            filter2YearSelect.appendChild(option);
        });
    }

    // Populate value dropdown for filter1 (single value, not range)
    function populateFilter1Value(paramCode) {
        const range = getParameterRange(paramCode);
        filter1ValueSelect.innerHTML = '';
        range.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            filter1ValueSelect.appendChild(option);
        });
    }

    // Populate value dropdown for filter2 (single value, not range)
    function populateFilter2Value(paramCode) {
        const range = getParameterRange(paramCode);
        filter2ValueSelect.innerHTML = '';
        range.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.display;
            filter2ValueSelect.appendChild(option);
        });
    }

    // Populate range dropdowns for first parameter
    function populateParam1Range(paramCode) {
        const range = getParameterRange(paramCode);
        
        param1FromSelect.innerHTML = '';
        param1ToSelect.innerHTML = '';
        
        range.forEach(item => {
            const fromOption = document.createElement('option');
            fromOption.value = item.value;
            fromOption.textContent = item.display;
            param1FromSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = item.value;
            toOption.textContent = item.display;
            param1ToSelect.appendChild(toOption);
        });

        // Set "to" dropdown to last value by default
        if (range.length > 0) {
            param1ToSelect.selectedIndex = range.length - 1;
        }

        // Show range selection
        param1RangeDiv.style.display = 'block';
    }

    // Validate that "to" >= "from"
    function validateParam1Range() {
        const fromValue = parseFloat(param1FromSelect.value);
        const toValue = parseFloat(param1ToSelect.value);
        
        if (toValue < fromValue) {
            param1ToSelect.value = param1FromSelect.value;
        }
    }

    // Validate that "to day" >= "from day"
    function validateDayRange() {
        const fromDay = parseInt(param1DayFromSelect.value);
        const toDay = parseInt(param1DayToSelect.value);
        
        if (toDay < fromDay) {
            param1DayToSelect.value = param1DayFromSelect.value;
        }
    }

    // Populate range dropdowns for second parameter
    function populateParam2Range(paramCode) {
        const range = getParameterRange(paramCode);
        
        param2FromSelect.innerHTML = '';
        param2ToSelect.innerHTML = '';
        
        range.forEach(item => {
            const fromOption = document.createElement('option');
            fromOption.value = item.value;
            fromOption.textContent = item.display;
            param2FromSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = item.value;
            toOption.textContent = item.display;
            param2ToSelect.appendChild(toOption);
        });

        // Set "to" dropdown to last value by default
        if (range.length > 0) {
            param2ToSelect.selectedIndex = range.length - 1;
        }

        // Show range selection
        param2RangeDiv.style.display = 'block';
    }

    // Validate that "to" >= "from" for param2
    function validateParam2Range() {
        const fromValue = parseFloat(param2FromSelect.value);
        const toValue = parseFloat(param2ToSelect.value);
        
        if (toValue < fromValue) {
            param2ToSelect.value = param2FromSelect.value;
        }
    }

    // Validate that "to day" >= "from day" for param2
    function validateDayRange2() {
        const fromDay = parseInt(param2DayFromSelect.value);
        const toDay = parseInt(param2DayToSelect.value);
        
        if (toDay < fromDay) {
            param2DayToSelect.value = param2DayFromSelect.value;
        }
    }

    // Event Listeners

    // First parameter selection - show range when selected
    param1Select.addEventListener('change', () => {
        if (param1Select.value) {
            // Check if this is the day (TT) parameter
            if (param1Select.value === 'TT') {
                param1RangeDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                param1DayFieldsDiv.style.display = 'block';
                populateDayFields();
            }
            // Check if this is the time (ZZ) parameter
            else if (param1Select.value === 'ZZ') {
                param1RangeDiv.style.display = 'none';
                param1DayFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'block';
                // Reset timezone to CET
                document.getElementById('param1-tz-cet').checked = true;
            }
            // Check if this is the solar altitude (SH) parameter
            else if (param1Select.value === 'SH') {
                param1RangeDiv.style.display = 'none';
                param1DayFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'block';
                // Reset to mean (default)
                document.getElementById('param1-sh-mean').checked = true;
            }
            // Check if this is the halo type (EE) parameter
            else if (param1Select.value === 'EE') {
                param1RangeDiv.style.display = 'none';
                param1DayFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'block';
                // Reset to split (default)
                document.getElementById('param1-ee-split').checked = true;
            }
            // Check if this is the cirrus type (C) parameter
            else if (param1Select.value === 'C') {
                param1RangeDiv.style.display = 'none';
                param1DayFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'block';
                // Reset to split (default)
                document.getElementById('param1-c-split').checked = true;
            }
            // Check if this is the duration (DD) parameter
            else if (param1Select.value === 'DD') {
                param1RangeDiv.style.display = 'none';
                param1DayFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'block';
                // Reset to include (default)
                document.getElementById('param1-dd-incomplete').checked = true;
            }
            else {
                param1RangeDiv.style.display = 'block';
                param1DayFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                populateParam1Range(param1Select.value);
            }
        } else {
            param1RangeDiv.style.display = 'none';
            param1DayFieldsDiv.style.display = 'none';
            param1TimeFieldsDiv.style.display = 'none';
            param1ShFieldsDiv.style.display = 'none';
            param1EeFieldsDiv.style.display = 'none';
            param1CFieldsDiv.style.display = 'none';
            param1DdFieldsDiv.style.display = 'none';
        }
        updateAvailableOptions();
    });

    // Range validation
    param1FromSelect.addEventListener('change', validateParam1Range);
    param1ToSelect.addEventListener('change', validateParam1Range);

    // Day range validation
    param1DayFromSelect.addEventListener('change', validateDayRange);
    param1DayToSelect.addEventListener('change', validateDayRange);

    // Range validation
    param1FromSelect.addEventListener('change', validateParam1Range);
    param1ToSelect.addEventListener('change', validateParam1Range);

    // Day range validation
    param1DayFromSelect.addEventListener('change', validateDayRange);
    param1DayToSelect.addEventListener('change', validateDayRange);

    // Range validation for param2
    param2FromSelect.addEventListener('change', validateParam2Range);
    param2ToSelect.addEventListener('change', validateParam2Range);

    // Day range validation for param2
    param2DayFromSelect.addEventListener('change', validateDayRange2);
    param2DayToSelect.addEventListener('change', validateDayRange2);

    // Second parameter selection - show range/special fields when selected
    param2Select.addEventListener('change', () => {
        if (param2Select.value) {
            // Check if this is the day (TT) parameter
            if (param2Select.value === 'TT') {
                param2RangeDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'block';
                populateDayFields2();
            }
            // Check if this is the time (ZZ) parameter
            else if (param2Select.value === 'ZZ') {
                param2RangeDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'block';
                // Reset timezone to CET
                document.getElementById('param2-tz-cet').checked = true;
            }
            // Check if this is the solar altitude (SH) parameter
            else if (param2Select.value === 'SH') {
                param2RangeDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'block';
                // Reset to mean (default)
                document.getElementById('param2-sh-mean').checked = true;
            }
            // Check if this is the halo type (EE) parameter
            else if (param2Select.value === 'EE') {
                param2RangeDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'block';
                // Reset to split (default)
                document.getElementById('param2-ee-split').checked = true;
            }
            // Check if this is the cirrus type (C) parameter
            else if (param2Select.value === 'C') {
                param2RangeDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'block';
                // Reset to split (default)
                document.getElementById('param2-c-split').checked = true;
            }
            // Check if this is the duration (DD) parameter
            else if (param2Select.value === 'DD') {
                param2RangeDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'block';
                // Reset to include (default)
                document.getElementById('param2-dd-incomplete').checked = true;
            }
            else {
                param2RangeDiv.style.display = 'block';
                param2DayFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                populateParam2Range(param2Select.value);
            }
        } else {
            param2RangeDiv.style.display = 'none';
            param2DayFieldsDiv.style.display = 'none';
            param2TimeFieldsDiv.style.display = 'none';
            param2ShFieldsDiv.style.display = 'none';
            param2EeFieldsDiv.style.display = 'none';
            param2CFieldsDiv.style.display = 'none';
            param2DdFieldsDiv.style.display = 'none';
        }
        updateAvailableOptions();
    });

    // Add change listener for filter1 parameter
    filter1Select.addEventListener('change', () => {
        if (filter1Select.value) {
            // Check if this is the day (TT) parameter
            if (filter1Select.value === 'TT') {
                filter1ValueDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'none';
                filter1DayFieldsDiv.style.display = 'block';
                populateFilter1DayFields();
                // Also populate day values (1-31) in the main value dropdown
                filter1ValueDiv.style.display = 'block';
                populateFilter1Value('TT');
            }
            // Check if this is the time (ZZ) parameter
            else if (filter1Select.value === 'ZZ') {
                filter1ValueDiv.style.display = 'block';
                filter1DayFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'block';
                populateFilter1Value('ZZ');
                // Reset timezone to CET
                document.getElementById('filter1-tz-cet').checked = true;
            }
            // Check if this is the solar altitude (SH) parameter
            else if (filter1Select.value === 'SH') {
                filter1ValueDiv.style.display = 'block';
                filter1DayFieldsDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'block';
                populateFilter1Value('SH');
                // Reset to mean (default)
                document.getElementById('filter1-sh-mean').checked = true;
            }
            // Check if this is the halo type (EE) parameter
            else if (filter1Select.value === 'EE') {
                filter1ValueDiv.style.display = 'block';
                filter1DayFieldsDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'block';
                populateFilter1Value('EE');
                // Reset to split (default)
                document.getElementById('filter1-ee-split-yes').checked = true;
            }
            // Check if this is the cirrus type (C) parameter
            else if (filter1Select.value === 'C') {
                filter1ValueDiv.style.display = 'block';
                filter1DayFieldsDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'block';
                populateFilter1Value('C');
                // Reset to split (default)
                document.getElementById('filter1-c-split-yes').checked = true;
            }
            // Check if this is the duration (DD) parameter
            else if (filter1Select.value === 'DD') {
                filter1ValueDiv.style.display = 'block';
                filter1DayFieldsDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'block';
                populateFilter1Value('DD');
                // Reset to include (default)
                document.getElementById('filter1-dd-include').checked = true;
            }
            // All other parameters - just show single value dropdown
            else {
                filter1ValueDiv.style.display = 'block';
                filter1DayFieldsDiv.style.display = 'none';
                filter1TimeFieldsDiv.style.display = 'none';
                filter1ShFieldsDiv.style.display = 'none';
                filter1EeFieldsDiv.style.display = 'none';
                filter1CFieldsDiv.style.display = 'none';
                filter1DdFieldsDiv.style.display = 'none';
                populateFilter1Value(filter1Select.value);
            }
            // Enable filter2 when filter1 has a value
            filter2Select.disabled = false;
        } else {
            filter1ValueDiv.style.display = 'none';
            filter1DayFieldsDiv.style.display = 'none';
            filter1TimeFieldsDiv.style.display = 'none';
            filter1ShFieldsDiv.style.display = 'none';
            filter1EeFieldsDiv.style.display = 'none';
            filter1CFieldsDiv.style.display = 'none';
            filter1DdFieldsDiv.style.display = 'none';
            // Disable and reset filter2 when filter1 is empty
            filter2Select.disabled = true;
            filter2Select.value = '';
            // Hide all filter2 fields
            filter2ValueDiv.style.display = 'none';
            filter2DayFieldsDiv.style.display = 'none';
            filter2TimeFieldsDiv.style.display = 'none';
            filter2ShFieldsDiv.style.display = 'none';
            filter2EeFieldsDiv.style.display = 'none';
            filter2CFieldsDiv.style.display = 'none';
            filter2DdFieldsDiv.style.display = 'none';
        }
        updateAvailableOptions();
    });

    // Add change listener for filter2 parameter
    filter2Select.addEventListener('change', () => {
        if (filter2Select.value) {
            // Check if this is the day (TT) parameter
            if (filter2Select.value === 'TT') {
                filter2ValueDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'none';
                filter2DayFieldsDiv.style.display = 'block';
                populateFilter2DayFields();
                // Also populate day values (1-31) in the main value dropdown
                filter2ValueDiv.style.display = 'block';
                populateFilter2Value('TT');
            }
            // Check if this is the time (ZZ) parameter
            else if (filter2Select.value === 'ZZ') {
                filter2ValueDiv.style.display = 'block';
                filter2DayFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'block';
                populateFilter2Value('ZZ');
                // Reset timezone to CET
                document.getElementById('filter2-tz-cet').checked = true;
            }
            // Check if this is the solar altitude (SH) parameter
            else if (filter2Select.value === 'SH') {
                filter2ValueDiv.style.display = 'block';
                filter2DayFieldsDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'block';
                populateFilter2Value('SH');
                // Reset to mean (default)
                document.getElementById('filter2-sh-mean').checked = true;
            }
            // Check if this is the halo type (EE) parameter
            else if (filter2Select.value === 'EE') {
                filter2ValueDiv.style.display = 'block';
                filter2DayFieldsDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'block';
                populateFilter2Value('EE');
                // Reset to split (default)
                document.getElementById('filter2-ee-split-yes').checked = true;
            }
            // Check if this is the cirrus type (C) parameter
            else if (filter2Select.value === 'C') {
                filter2ValueDiv.style.display = 'block';
                filter2DayFieldsDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'block';
                populateFilter2Value('C');
                // Reset to split (default)
                document.getElementById('filter2-c-split-yes').checked = true;
            }
            // Check if this is the duration (DD) parameter
            else if (filter2Select.value === 'DD') {
                filter2ValueDiv.style.display = 'block';
                filter2DayFieldsDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'block';
                populateFilter2Value('DD');
                // Reset to include (default)
                document.getElementById('filter2-dd-include').checked = true;
            }
            // All other parameters - just show single value dropdown
            else {
                filter2ValueDiv.style.display = 'block';
                filter2DayFieldsDiv.style.display = 'none';
                filter2TimeFieldsDiv.style.display = 'none';
                filter2ShFieldsDiv.style.display = 'none';
                filter2EeFieldsDiv.style.display = 'none';
                filter2CFieldsDiv.style.display = 'none';
                filter2DdFieldsDiv.style.display = 'none';
                populateFilter2Value(filter2Select.value);
            }
        } else {
            filter2ValueDiv.style.display = 'none';
            filter2DayFieldsDiv.style.display = 'none';
            filter2TimeFieldsDiv.style.display = 'none';
            filter2ShFieldsDiv.style.display = 'none';
            filter2EeFieldsDiv.style.display = 'none';
            filter2CFieldsDiv.style.display = 'none';
            filter2DdFieldsDiv.style.display = 'none';
        }
        updateAvailableOptions();
    });

    // Parameter selection - Apply button
    btnApplyParam.addEventListener('click', () => {
        // Validate: First parameter is required
        if (!param1Select.value) {
            const lang = window.currentLanguage || 'de';
            const message = lang === 'de' 
                ? 'Bitte wählen Sie mindestens den ersten Parameter aus!' 
                : 'Please select at least the first parameter!';
            alert(message);
            return;
        }

        // Collect selected parameters
        const selectedParams = {
            param1: param1Select.value,
            param1_from: param1FromSelect.value || null,
            param1_to: param1ToSelect.value || null,
            param2: param2Select.value || null,
            filter1: filter1Select.value || null,
            filter2: filter2Select.value || null
        };

        // Handle special cases
        if (param1Select.value === 'TT') {
            // Day parameter - add month, year, and day range
            selectedParams.param1_month = param1MonthSelect.value;
            selectedParams.param1_year = param1YearSelect.value;
            selectedParams.param1_day_from = param1DayFromSelect.value;
            selectedParams.param1_day_to = param1DayToSelect.value;
        } else if (param1Select.value === 'ZZ') {
            // Time parameter - add timezone selection
            const selectedTz = document.querySelector('input[name="param1-timezone"]:checked');
            selectedParams.param1_timezone = selectedTz.value; // 'cet' or 'local'
        } else if (param1Select.value === 'SH') {
            // Solar altitude parameter - add time calculation method
            const selectedSh = document.querySelector('input[name="param1-sh-time"]:checked');
            selectedParams.param1_sh_time = selectedSh.value; // 'min', 'mean', or 'max'
        } else if (param1Select.value === 'EE') {
            // Halo type parameter - add split option
            const selectedEe = document.querySelector('input[name="param1-ee-split"]:checked');
            selectedParams.param1_ee_split = selectedEe.value === 'split'; // true or false
        } else if (param1Select.value === 'C') {
            // Cirrus type parameter - add split option
            const selectedC = document.querySelector('input[name="param1-c-split"]:checked');
            selectedParams.param1_c_split = selectedC.value === 'split'; // true or false
        } else if (param1Select.value === 'DD') {
            // Duration parameter - add incomplete observation filter
            const selectedDd = document.querySelector('input[name="param1-dd-incomplete"]:checked');
            selectedParams.param1_dd_incomplete = selectedDd.value === 'include'; // true to include, false to exclude
        }

        // Handle special cases for param2
        if (param2Select.value === 'TT') {
            // Day parameter - add month, year, and day range
            selectedParams.param2_month = param2MonthSelect.value;
            selectedParams.param2_year = param2YearSelect.value;
            selectedParams.param2_day_from = param2DayFromSelect.value;
            selectedParams.param2_day_to = param2DayToSelect.value;
        } else if (param2Select.value === 'ZZ') {
            // Time parameter - add timezone selection
            const selectedTz = document.querySelector('input[name="param2-timezone"]:checked');
            selectedParams.param2_timezone = selectedTz.value; // 'cet' or 'local'
        } else if (param2Select.value === 'SH') {
            // Solar altitude parameter - add time calculation method
            const selectedSh = document.querySelector('input[name="param2-sh-time"]:checked');
            selectedParams.param2_sh_time = selectedSh.value; // 'min', 'mean', or 'max'
        } else if (param2Select.value === 'EE') {
            // Halo type parameter - add split option
            const selectedEe = document.querySelector('input[name="param2-ee-split"]:checked');
            selectedParams.param2_ee_split = selectedEe.value === 'split'; // true or false
        } else if (param2Select.value === 'C') {
            // Cirrus type parameter - add split option
            const selectedC = document.querySelector('input[name="param2-c-split"]:checked');
            selectedParams.param2_c_split = selectedC.value === 'split'; // true or false
        } else if (param2Select.value === 'DD') {
            // Duration parameter - add incomplete observation filter
            const selectedDd = document.querySelector('input[name="param2-dd-incomplete"]:checked');
            selectedParams.param2_dd_incomplete = selectedDd.value === 'include'; // true to include, false to exclude
        }

        // Handle special cases for filter1
        if (filter1Select.value) {
            selectedParams.filter1_value = filter1ValueSelect.value;
            
            if (filter1Select.value === 'TT') {
                // Day parameter - add month and year
                selectedParams.filter1_month = filter1MonthSelect.value;
                selectedParams.filter1_year = filter1YearSelect.value;
            } else if (filter1Select.value === 'ZZ') {
                // Time parameter - add timezone selection
                const selectedTz = document.querySelector('input[name="filter1-timezone"]:checked');
                selectedParams.filter1_timezone = selectedTz.value; // 'CET' or 'local'
            } else if (filter1Select.value === 'SH') {
                // Solar altitude parameter - add time calculation method
                const selectedSh = document.querySelector('input[name="filter1-sh-time"]:checked');
                selectedParams.filter1_sh_time = selectedSh.value; // 'min', 'mean', or 'max'
            } else if (filter1Select.value === 'EE') {
                // Halo type parameter - add split option
                const selectedEe = document.querySelector('input[name="filter1-ee-split"]:checked');
                selectedParams.filter1_ee_split = selectedEe.value === 'split'; // true or false
            } else if (filter1Select.value === 'C') {
                // Cirrus type parameter - add split option
                const selectedC = document.querySelector('input[name="filter1-c-split"]:checked');
                selectedParams.filter1_c_split = selectedC.value === 'split'; // true or false
            } else if (filter1Select.value === 'DD') {
                // Duration parameter - add incomplete observation filter
                const selectedDd = document.querySelector('input[name="filter1-dd-incomplete"]:checked');
                selectedParams.filter1_dd_incomplete = selectedDd.value === 'include'; // true to include, false to exclude
            }
        }

        // Handle special cases for filter2
        if (filter2Select.value) {
            selectedParams.filter2_value = filter2ValueSelect.value;
            
            if (filter2Select.value === 'TT') {
                // Day parameter - add month and year
                selectedParams.filter2_month = filter2MonthSelect.value;
                selectedParams.filter2_year = filter2YearSelect.value;
            } else if (filter2Select.value === 'ZZ') {
                // Time parameter - add timezone selection
                const selectedTz = document.querySelector('input[name="filter2-timezone"]:checked');
                selectedParams.filter2_timezone = selectedTz.value; // 'CET' or 'local'
            } else if (filter2Select.value === 'SH') {
                // Solar altitude parameter - add time calculation method
                const selectedSh = document.querySelector('input[name="filter2-sh-time"]:checked');
                selectedParams.filter2_sh_time = selectedSh.value; // 'min', 'mean', or 'max'
            } else if (filter2Select.value === 'EE') {
                // Halo type parameter - add split option
                const selectedEe = document.querySelector('input[name="filter2-ee-split"]:checked');
                selectedParams.filter2_ee_split = selectedEe.value === 'split'; // true or false
            } else if (filter2Select.value === 'C') {
                // Cirrus type parameter - add split option
                const selectedC = document.querySelector('input[name="filter2-c-split"]:checked');
                selectedParams.filter2_c_split = selectedC.value === 'split'; // true or false
            } else if (filter2Select.value === 'DD') {
                // Duration parameter - add incomplete observation filter
                const selectedDd = document.querySelector('input[name="filter2-dd-incomplete"]:checked');
                selectedParams.filter2_dd_incomplete = selectedDd.value === 'include'; // true to include, false to exclude
            }
        }

        // Log configuration (for now - will implement analysis later)
        console.log('Analysis configuration:', selectedParams);
        
        const lang = window.currentLanguage || 'de';
        const message = lang === 'de'
            ? 'Auswertung konfiguriert. Implementierung folgt.'
            : 'Analysis configured. Implementation pending.';
        alert(message);
        
        // For now, return to main
        window.location.href = '/';
    });

    btnCancelParam.addEventListener('click', () => {
        window.location.href = '/';
    });

    // ESC key support - close current dialog and return to main
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            window.location.href = '/';
        }
    });

    // Initialize
    await loadI18n();
    await loadObservers();
    populateParameterSelects();
    
    // Disable filter2 initially (until filter1 is selected)
    filter2Select.disabled = true;
    
    // Show parameter dialog on load
    const modal = new bootstrap.Modal(paramDialog);
    modal.show();
});
