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
    const param1ShFromSelect = document.getElementById('param1-sh-from');
    const param1ShToSelect = document.getElementById('param1-sh-to');

    // Special halo type parameter elements
    const param1EeFieldsDiv = document.getElementById('param1-ee-fields');
    const param1EeSplitRadios = document.querySelectorAll('input[name="param1-ee-split"]');
    const param1EeFromSelect = document.getElementById('param1-ee-from');
    const param1EeToSelect = document.getElementById('param1-ee-to');

    // Special cirrus type parameter elements
    const param1CFieldsDiv = document.getElementById('param1-c-fields');
    const param1CSplitRadios = document.querySelectorAll('input[name="param1-c-split"]');
    const param1CFromSelect = document.getElementById('param1-c-from');
    const param1CToSelect = document.getElementById('param1-c-to');

    // Special duration parameter elements
    const param1DdFieldsDiv = document.getElementById('param1-dd-fields');
    const param1DdIncompleteRadios = document.querySelectorAll('input[name="param1-dd-incomplete"]');
    const param1DdFromSelect = document.getElementById('param1-dd-from');
    const param1DdToSelect = document.getElementById('param1-dd-to');

    // Range elements for second parameter
    const param2RangeDiv = document.getElementById('param2-range');
    const param2FromSelect = document.getElementById('param2-from');
    const param2ToSelect = document.getElementById('param2-to');
    const percentageModeFields = document.getElementById('percentage-mode-fields');

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
    const param2ShFromSelect = document.getElementById('param2-sh-from');
    const param2ShToSelect = document.getElementById('param2-sh-to');

    // Special halo type parameter elements for param2
    const param2EeFieldsDiv = document.getElementById('param2-ee-fields');
    const param2EeSplitRadios = document.querySelectorAll('input[name="param2-ee-split"]');
    const param2EeFromSelect = document.getElementById('param2-ee-from');
    const param2EeToSelect = document.getElementById('param2-ee-to');

    // Special cirrus type parameter elements for param2
    const param2CFieldsDiv = document.getElementById('param2-c-fields');
    const param2CSplitRadios = document.querySelectorAll('input[name="param2-c-split"]');
    const param2CFromSelect = document.getElementById('param2-c-from');
    const param2CToSelect = document.getElementById('param2-c-to');

    // Special duration parameter elements for param2
    const param2DdFieldsDiv = document.getElementById('param2-dd-fields');
    const param2DdIncompleteRadios = document.querySelectorAll('input[name="param2-dd-incomplete"]');
    const param2DdFromSelect = document.getElementById('param2-dd-from');
    const param2DdToSelect = document.getElementById('param2-dd-to');

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
            const lang = langData.language;

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
            observers = data.observers;
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

        // Update param2 options (exclude param1 and incompatible combinations)
        Array.from(param2Select.options).forEach(option => {
            if (option.value === '') return; // Keep empty option

            let shouldDisable = selectedValues.includes(option.value) && option.value !== param2Select.value;
            const param1Value = param1Select.value;

            // Incompatible day/month/year combinations
            if ((option.value === 'TT' && (param1Value === 'MM' || param1Value === 'JJ')) ||
                (option.value === 'JJ' && param1Value === 'TT') ||
                (option.value === 'MM' && param1Value === 'TT')) {
                shouldDisable = true;
            }

            option.disabled = shouldDisable;
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
                return i18n.months[String(monthNum)];
            }
            // Fallback to array (0-indexed)
            const monthArray = i18n.months;
            return monthArray[monthNum - 1];
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
                    hours.push({ value: i, display: `${i} Uhr` });
                }
                return hours;
            
            case 'SH':
                // Solar altitude: all degrees from -10 to 90
                const altitudes = [];
                for (let i = -10; i <= 90; i++) {
                    altitudes.push({ value: i, display: String(i) + '°' });
                }
                return altitudes;
            
            case 'KK':
                // Format: "44 - Hans Mustermann"
                return observers.map(obs => ({
                    value: obs.KK,
                    display: `${String(obs.KK).padStart(2, '0')} - ${obs.VName} ${obs.NName}`
                }));
            
            case 'GG':
                // Use exact region list from observation form
                const regionNumbers = [1,2,3,4,5,6,7,8,9,10,11,16,17,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39];
                return regionNumbers.map(gg => {
                    const regionName = i18n.geographic_regions[String(gg)];
                    return { value: gg, display: `${String(gg).padStart(2, '0')} - ${regionName}` };
                });
            
            case 'O':
                const objects = [];
                for (let i = 1; i <= 5; i++) {
                    const objName = i18n.object_types[String(i)];
                    objects.push({ value: i, display: `${i} - ${objName}` });
                }
                return objects;
            
            case 'f':
                // Weather front with text names
                const fronts = [];
                for (let i = 0; i <= 8; i++) {
                    const frontName = i18n.weather_front[String(i)];
                    fronts.push({ value: i, display: `${i} - ${frontName}` });
                }
                return fronts;
            
            case 'C':
                // Cirrus type with text names
                const cirrus = [];
                for (let i = 0; i <= 7; i++) {
                    const cirrusName = i18n.cirrus_types[String(i)];
                    cirrus.push({ value: i, display: `${i} - ${cirrusName}` });
                }
                return cirrus;
            
            case 'd':
                // Cirrus density - use exact format from observation form
                return [
                    { value: 0, display: `0 - ${i18n.cirrus_density['0']}` },
                    { value: 1, display: `1 - ${i18n.cirrus_density['1']}` },
                    { value: 2, display: `2 - ${i18n.cirrus_density['2']}` },
                    { value: 4, display: `4 - ${i18n.cirrus_density['4']}` },
                    { value: 5, display: `5 - ${i18n.cirrus_density['5']}` },
                    { value: 6, display: `6 - ${i18n.cirrus_density['6']}` },
                    { value: 7, display: `7 - ${i18n.cirrus_density['7']}` }
                ];
            
            case 'EE':
                // Only halo types 1-77 and 99 (exclude 78-98)
                const haloTypes = [];
                for (let i = 1; i <= 77; i++) {
                    const haloName = i18n.halo_types[String(i)];
                    haloTypes.push({ value: i, display: `${String(i).padStart(2, '0')} - ${haloName}` });
                }
                haloTypes.push({ value: 99, display: `99 - ${i18n.halo_types['99']}` });
                return haloTypes;
            
            case 'DD':
                // Duration: display key values 0, 10, 20, 30, etc.
                const durations = [];
                for (let i = 0; i <= 99; i += 10) {
                    const minuteText = i18n.fields.minutes;
                    durations.push({ value: i, display: `${i} ${minuteText}` });
                }
                return durations;
            
            case 'H':
                // Brightness with text values
                const brightness = [];
                for (let i = 0; i <= 3; i++) {
                    const brightName = i18n.brightness[String(i)];
                    brightness.push({ value: i, display: `${i} - ${brightName}` });
                }
                return brightness;
            
            case 'F':
                // Color with text values
                const colours = [];
                for (let i = 0; i <= 5; i++) {
                    const colorName = i18n.color[String(i)];
                    colours.push({ value: i, display: `${i} - ${colorName}` });
                }
                return colours;
            
            case 'V':
                // Completeness with text values
                return [
                    { value: 1, display: `1 - ${i18n.completeness['1']}` },
                    { value: 2, display: `2 - ${i18n.completeness['2']}` }
                ];
            
            case 'zz':
                // Zeit bis Niederschlag (hours): 0 hours, 1 hours, etc.
                const zzTimes = [];
                for (let i = 0; i <= 99; i++) {
                    const hourText = i18n.fields.hours;
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
                return [{ value: 0, display: i18n.fields.not_applicable }];
            
            default:
                return [];
        }
    }

    // Map raw parameter value to its display label using the same data used for dropdowns
    const valueLabelCache = {};
    function formatParamValue(paramCode, rawValue) {
        // Special handling for KK (observer) - search observers array directly
        if (paramCode === 'KK') {
            const kk = String(parseInt(rawValue));
            const observer = observers.find(obs => String(obs.KK) === kk);
            return `${kk.padStart(2, '0')} - ${observer.VName} ${observer.NName}`;
        }
        
        if (!valueLabelCache[paramCode]) {
            valueLabelCache[paramCode] = getParameterRange(paramCode).reduce((acc, item) => {
                acc[String(item.value)] = item.display;
                return acc;
            }, {});
        }
        const cache = valueLabelCache[paramCode];
        const key = String(rawValue);
        return cache && cache[key] ? cache[key] : rawValue;
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

    // Populate range dropdowns for special parameters (SH, C, EE, DD)
    function populateSpecialRangeSelects(paramCode, fromSelect, toSelect) {
        const range = getParameterRange(paramCode);
        
        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';
        
        range.forEach(item => {
            const fromOption = document.createElement('option');
            fromOption.value = item.value;
            fromOption.textContent = item.display;
            fromSelect.appendChild(fromOption);
            
            const toOption = document.createElement('option');
            toOption.value = item.value;
            toOption.textContent = item.display;
            toSelect.appendChild(toOption);
        });

        // Set "to" dropdown to last value by default
        if (range.length > 0) {
            toSelect.selectedIndex = range.length - 1;
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
        // Enable/disable OK button based on param1 selection
        btnApplyParam.disabled = !param1Select.value;
        
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
                param1DayFieldsDiv.style.display = 'none';
                param1ShFieldsDiv.style.display = 'none';
                param1EeFieldsDiv.style.display = 'none';
                param1CFieldsDiv.style.display = 'none';
                param1DdFieldsDiv.style.display = 'none';
                param1TimeFieldsDiv.style.display = 'block';
                // Show range selection for hours (0-23)
                populateParam1Range('ZZ');
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
                // Populate range selects for solar altitude
                populateSpecialRangeSelects('SH', param1ShFromSelect, param1ShToSelect);
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
                // Populate range selects for halo type
                populateSpecialRangeSelects('EE', param1EeFromSelect, param1EeToSelect);
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
                // Populate range selects for cirrus type
                populateSpecialRangeSelects('C', param1CFromSelect, param1CToSelect);
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
                // Populate range selects for duration
                populateSpecialRangeSelects('DD', param1DdFromSelect, param1DdToSelect);
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
        
        // Disable incompatible second parameter options
        // TT (day) makes no sense with MM (month) because day needs specific month/year
        const param2Options = param2Select.querySelectorAll('option');
        param2Options.forEach(option => {
            let shouldDisable = false;
            
            // Day (TT) cannot be param2 when Month (MM) is param1
            if (option.value === 'TT' && param1Select.value === 'MM') {
                shouldDisable = true;
            }
            
            // Day (TT) cannot be param2 when Year (JJ) is param1
            if (option.value === 'TT' && param1Select.value === 'JJ') {
                shouldDisable = true;
            }
            
            // Year (JJ) cannot be param2 when Day (TT) is param1
            if (option.value === 'JJ' && param1Select.value === 'TT') {
                shouldDisable = true;
            }
            
            // Month (MM) cannot be param2 when Day (TT) is param1
            if (option.value === 'MM' && param1Select.value === 'TT') {
                shouldDisable = true;
            }
            
            if (shouldDisable) {
                option.disabled = true;
                // If this option was already selected, clear it
                if (param2Select.value === option.value) {
                    param2Select.value = '';
                    param2RangeDiv.style.display = 'none';
                    param2DayFieldsDiv.style.display = 'none';
                    param2TimeFieldsDiv.style.display = 'none';
                    param2ShFieldsDiv.style.display = 'none';
                    param2EeFieldsDiv.style.display = 'none';
                    param2CFieldsDiv.style.display = 'none';
                    param2DdFieldsDiv.style.display = 'none';
                    percentageModeFields.style.display = 'none';
                }
            } else {
                // Re-enable options that are not in conflict
                option.disabled = false;
            }
        });
        
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
            // Validate parameter combinations - prevent incompatible selections
            const param1Value = param1Select.value;
            const param2Value = param2Select.value;
            
            // Check for incompatible combinations and clear selection if found
            if ((param2Value === 'TT' && (param1Value === 'MM' || param1Value === 'JJ')) ||
                (param2Value === 'JJ' && param1Value === 'TT') ||
                (param2Value === 'MM' && param1Value === 'TT')) {
                // Clear the invalid selection
                param2Select.value = '';
                // Hide all param2 fields
                param2RangeDiv.style.display = 'none';
                param2DayFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                percentageModeFields.style.display = 'none';
                return; // Exit early
            }
            
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
                param2DayFieldsDiv.style.display = 'none';
                param2ShFieldsDiv.style.display = 'none';
                param2EeFieldsDiv.style.display = 'none';
                param2CFieldsDiv.style.display = 'none';
                param2DdFieldsDiv.style.display = 'none';
                param2TimeFieldsDiv.style.display = 'block';
                // Show range selection for hours (0-23)
                populateParam2Range('ZZ');
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
                // Populate range selects for solar altitude
                populateSpecialRangeSelects('SH', param2ShFromSelect, param2ShToSelect);
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
                // Populate range selects for halo type
                populateSpecialRangeSelects('EE', param2EeFromSelect, param2EeToSelect);
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
                // Populate range selects for cirrus type
                populateSpecialRangeSelects('C', param2CFromSelect, param2CToSelect);
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
                // Populate range selects for duration
                populateSpecialRangeSelects('DD', param2DdFromSelect, param2DdToSelect);
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
            percentageModeFields.style.display = 'block';
        } else {
            param2RangeDiv.style.display = 'none';
            param2DayFieldsDiv.style.display = 'none';
            param2TimeFieldsDiv.style.display = 'none';
            param2ShFieldsDiv.style.display = 'none';
            param2EeFieldsDiv.style.display = 'none';
            param2CFieldsDiv.style.display = 'none';
            param2DdFieldsDiv.style.display = 'none';
            percentageModeFields.style.display = 'none';
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
    btnApplyParam.addEventListener('click', async () => {
        // Collect selected parameters
        const selectedParams = {
            param1: param1Select.value,
            param1_from: param1FromSelect.value,
            param1_to: param1ToSelect.value,
            param2: param2Select.value,
            filter1: filter1Select.value,
            filter2: filter2Select.value
        };

        // Handle special cases
        if (param1Select.value === 'TT') {
            // Day parameter - add month, year, and day range
            selectedParams.param1_month = param1MonthSelect.value;
            selectedParams.param1_year = param1YearSelect.value;
            selectedParams.param1_from = param1DayFromSelect.value;
            selectedParams.param1_to = param1DayToSelect.value;
        } else if (param1Select.value === 'ZZ') {
            // Time parameter - add timezone selection
            const selectedTz = document.querySelector('input[name="param1-timezone"]:checked');
            selectedParams.param1_timezone = selectedTz.value; // 'cet' or 'local'
        } else if (param1Select.value === 'SH') {
            // Solar altitude parameter - add time calculation method and range
            const selectedSh = document.querySelector('input[name="param1-sh-time"]:checked');
            selectedParams.param1_sh_time = selectedSh.value; // 'min', 'mean', or 'max'
            selectedParams.param1_from = param1ShFromSelect.value;
            selectedParams.param1_to = param1ShToSelect.value;
        } else if (param1Select.value === 'EE') {
            // Halo type parameter - add split option and range
            const selectedEe = document.querySelector('input[name="param1-ee-split"]:checked');
            selectedParams.param1_ee_split = selectedEe.value === 'split'; // true or false
            selectedParams.param1_from = param1EeFromSelect.value;
            selectedParams.param1_to = param1EeToSelect.value;
        } else if (param1Select.value === 'C') {
            // Cirrus type parameter - add split option and range
            const selectedC = document.querySelector('input[name="param1-c-split"]:checked');
            selectedParams.param1_c_split = selectedC.value === 'split'; // true or false
            selectedParams.param1_from = param1CFromSelect.value;
            selectedParams.param1_to = param1CToSelect.value;
        } else if (param1Select.value === 'DD') {
            // Duration parameter - add incomplete observation filter and range
            const selectedDd = document.querySelector('input[name="param1-dd-incomplete"]:checked');
            selectedParams.param1_dd_incomplete = selectedDd.value === 'include'; // true to include, false to exclude
            selectedParams.param1_from = param1DdFromSelect.value;
            selectedParams.param1_to = param1DdToSelect.value;
        }

        // Handle special cases for param2
        if (param2Select.value === 'TT') {
            // Day parameter - add month, year, and day range
            selectedParams.param2_month = param2MonthSelect.value;
            selectedParams.param2_year = param2YearSelect.value;
            selectedParams.param2_from = param2DayFromSelect.value;
            selectedParams.param2_to = param2DayToSelect.value;
        } else if (param2Select.value === 'ZZ') {
            // Time parameter - add timezone selection
            const selectedTz = document.querySelector('input[name="param2-timezone"]:checked');
            selectedParams.param2_timezone = selectedTz.value; // 'cet' or 'local'
        } else if (param2Select.value === 'SH') {
            // Solar altitude parameter - add time calculation method and range
            const selectedSh = document.querySelector('input[name="param2-sh-time"]:checked');
            selectedParams.param2_sh_time = selectedSh.value; // 'min', 'mean', or 'max'
            selectedParams.param2_from = param2ShFromSelect.value;
            selectedParams.param2_to = param2ShToSelect.value;
        } else if (param2Select.value === 'EE') {
            // Halo type parameter - add split option and range
            const selectedEe = document.querySelector('input[name="param2-ee-split"]:checked');
            selectedParams.param2_ee_split = selectedEe.value === 'split'; // true or false
            selectedParams.param2_from = param2EeFromSelect.value;
            selectedParams.param2_to = param2EeToSelect.value;
        } else if (param2Select.value === 'C') {
            // Cirrus type parameter - add split option and range
            const selectedC = document.querySelector('input[name="param2-c-split"]:checked');
            selectedParams.param2_c_split = selectedC.value === 'split'; // true or false
            selectedParams.param2_from = param2CFromSelect.value;
            selectedParams.param2_to = param2CToSelect.value;
        } else if (param2Select.value === 'DD') {
            // Duration parameter - add incomplete observation filter and range
            const selectedDd = document.querySelector('input[name="param2-dd-incomplete"]:checked');
            selectedParams.param2_dd_incomplete = selectedDd.value === 'include'; // true to include, false to exclude
            selectedParams.param2_from = param2DdFromSelect.value;
            selectedParams.param2_to = param2DdToSelect.value;
        }

        // Handle special cases for filter1
        if (filter1Select.value) {
            selectedParams.filter1_value = filter1ValueSelect.value;
            // Store display text for restrictions display
            const selectedOption = filter1ValueSelect.options[filter1ValueSelect.selectedIndex];
            selectedParams.filter1_display = selectedOption ? selectedOption.text : filter1ValueSelect.value;
            
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
            // Store display text for restrictions display
            const selectedOption = filter2ValueSelect.options[filter2ValueSelect.selectedIndex];
            selectedParams.filter2_display = selectedOption ? selectedOption.text : filter2ValueSelect.value;
            
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

        // Add percentage mode for two-parameter analysis
        if (selectedParams.param2) {
            const percentageMode = document.querySelector('input[name="percentage-mode"]:checked');
            selectedParams.percentage_mode = percentageMode ? percentageMode.value : 'global';
        }
        
        // Add percentage mode for two-parameter analysis
        if (selectedParams.param2) {
            const percentageMode = document.querySelector('input[name="percentage-mode"]:checked');
            selectedParams.percentage_mode = percentageMode ? percentageMode.value : 'global';
        }
        
        // Log configuration
        console.log('Analysis configuration:', selectedParams);
        
        // Close the parameter dialog
        const modalInstance = bootstrap.Modal.getInstance(paramDialog);
        if (modalInstance) {
            modalInstance.hide();
        }
        
        // Send to backend for processing
        try {
            const response = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedParams)
            });
            
            if (!response.ok) {
                showWarningModal('Fehler bei der Auswertung');
                return;
            }
            
            const result = await response.json();
            console.log('Analysis result:', result);
            
            // Display the result
            displayAnalysisResult(result, selectedParams);
        } catch (error) {
            console.error('Analysis error:', error);
            showWarningModal('Fehler: ' + error.message);
        }
    });

    btnCancelParam.addEventListener('click', () => {
        window.location.href = '/';
    });

    // Store last analysis result globally for print/save functionality
    let lastAnalysisResult = null;
    let lastAnalysisParams = null;

    // Display analysis result as table
    function displayAnalysisResult(result, params) {
        if (!result.success) {
            showWarningModal(result.error);
            return;
        }
        
        // Store result for later use (print/save)
        lastAnalysisResult = result;
        lastAnalysisParams = params;
        
        // Build title
        const param1Name = i18n.analysis_dialog.param_names[params.param1];
        const param2Name = params.param2 ? i18n.analysis_dialog.param_names[params.param2] : null;
        const titleText = param2Name 
            ? `${i18n.analysis_results.title_two_params}: ${param1Name} ${i18n.analysis_results.and} ${param2Name}`
            : `${i18n.analysis_results.title_one_param}: ${param1Name}`;
        
        // Build restrictions text
        let restrictionsHtml = '';
        const restrictions = [];
        if (params.filter1) {
            const filterName = i18n.analysis_dialog.param_names[params.filter1];
            const displayValue = params.filter1_display;
            restrictions.push(`${filterName} = ${displayValue}`);
        }
        if (params.filter2) {
            const filterName = i18n.analysis_dialog.param_names[params.filter2];
            const displayValue = params.filter2_display;
            restrictions.push(`${filterName} = ${displayValue}`);
        }
        
        if (restrictions.length > 0) {
            restrictionsHtml = `<div class="restrictions"><strong>${i18n.analysis_results.restrictions}:</strong> ${restrictions.join(', ')}</div>`;
        }
        
        // Build result HTML based on number of parameters
        let resultHtml = '';
        if (!params.param2) {
            // Single parameter - show simple table
            resultHtml = buildSingleParameterTable(result.data, param1Name, result.total, params.param1);
        } else {
            // Two parameters - show cross-tabulation
            const percentageMode = params.percentage_mode;
            resultHtml = buildTwoParameterTable(result.data, param1Name, param2Name, result.total, percentageMode, params.param1, params.param2);
        }
        
        // Combine all parts
        const html = `
            <div class="analysis-results">
                <h4>${titleText}</h4>
                ${restrictionsHtml}
                ${resultHtml}
            </div>
        `;
        
        // Show in modal dialog
        showResultModal(html);
    }
    
    // Show result in modal dialog
    function showResultModal(html) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('resultModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'resultModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${i18n.dialogs.analysis_title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="resultModalBody" style="overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 200px);">
                        </div>
                        <div class="modal-footer d-flex justify-content-end gap-2">
                            <button type="button" id="btn-result-bar-chart" class="btn btn-secondary btn-sm px-4">${i18n.button.bar_chart}</button>
                            <button type="button" id="btn-result-line-chart" class="btn btn-secondary btn-sm px-4">${i18n.button.line_chart}</button>
                            <button type="button" id="btn-result-print" class="btn btn-secondary btn-sm px-4">${i18n.button.print}</button>
                            <button type="button" id="btn-result-save" class="btn btn-secondary btn-sm px-4">${i18n.button.save}</button>
                            <button type="button" id="btn-result-ok" class="btn btn-primary btn-sm px-4">${i18n.button.ok}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Setup button handlers
            setupResultModalHandlers(modal);
        }
        
        // Set content
        document.getElementById('resultModalBody').innerHTML = html;
        
        // Show modal
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        // Focus OK button
        setTimeout(() => {
            document.getElementById('btn-result-ok').focus();
        }, 500);
    }
    
    // Setup result modal button handlers
    function setupResultModalHandlers(modal) {
        const btnOk = document.getElementById('btn-result-ok');
        const btnBarChart = document.getElementById('btn-result-bar-chart');
        const btnLineChart = document.getElementById('btn-result-line-chart');
        const btnPrint = document.getElementById('btn-result-print');
        const btnSave = document.getElementById('btn-result-save');
        
        // OK button - close modal and return to main
        if (btnOk) {
            btnOk.onclick = () => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
                window.location.href = '/';
            };
        }
        
        // Bar Chart button
        if (btnBarChart) {
            btnBarChart.onclick = () => {
                console.log('Bar chart button clicked');
                console.log('lastAnalysisResult:', lastAnalysisResult);
                console.log('lastAnalysisParams:', lastAnalysisParams);
                showBarChart();
            };
        }
        
        // Line Chart button
        if (btnLineChart) {
            btnLineChart.onclick = () => {
                console.log('Line chart button clicked');
                console.log('lastAnalysisResult:', lastAnalysisResult);
                console.log('lastAnalysisParams:', lastAnalysisParams);
                showLineChart();
            };
        }
        
        // Enter key support when modal is visible
        const enterKeyHandler = (e) => {
            if (e.key === 'Enter' && modal.classList.contains('show')) {
                e.preventDefault();
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
                window.location.href = '/';
            }
        };
        
        // ESC key support when modal is visible
        const escKeyHandler = (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                e.preventDefault();
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) modalInstance.hide();
                window.location.href = '/';
            }
        };
        
        // Remove any existing handlers first to avoid duplicates
        document.removeEventListener('keypress', enterKeyHandler);
        document.addEventListener('keypress', enterKeyHandler);
        document.removeEventListener('keydown', escKeyHandler);
        document.addEventListener('keydown', escKeyHandler);
        
        // Print button
        if (btnPrint) {
            btnPrint.onclick = () => {
                window.print();
            };
        }
        
        // Save button
        if (btnSave) {
            btnSave.onclick = () => {
                saveAnalysisResult();
            };
        }
    }
    
    // Show bar chart for analysis result
    function showBarChart() {
        if (!lastAnalysisResult || !lastAnalysisParams) return;

        const result = lastAnalysisResult;
        const params = lastAnalysisParams;
        const data = result.data;
        
        // Build title with parameter names and filters
        const param1Name = i18n.analysis_dialog.param_names[params.param1];
        const param2Name = params.param2 ? i18n.analysis_dialog.param_names[params.param2] : null;
        let titleText;
        
        if (param2Name) {
            titleText = `Parameter: ${param1Name} ${i18n.analysis_results.and} ${param2Name}`;
        } else {
            titleText = `Parameter: ${param1Name}`;
        }
        
        // Add filter restrictions to title
        const restrictions = [];
        if (params.filter1) {
            const filterName = i18n.analysis_dialog.param_names[params.filter1];
            const displayValue = params.filter1_display;
            restrictions.push(`${filterName} = ${displayValue}`);
        }
        if (params.filter2) {
            const filterName = i18n.analysis_dialog.param_names[params.filter2];
            const displayValue = params.filter2_display;
            restrictions.push(`${filterName} = ${displayValue}`);
        }
        if (restrictions.length > 0) {
            titleText += `\n${i18n.analysis_results.restrictions}: ${restrictions.join(', ')}`;
        }
        
        if (!params.param2) {
            // 1-parameter analysis: simple 2D bar chart using Chart.js
            // data is an array of {key: value, count: number}
            const labels = data.map(item => formatParamValue(params.param1, item.key));
            const counts = data.map(item => item.count);
            
            const datasets = [{
                label: i18n.analysis_results.count,
                data: counts,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }];
            
            showChart2D(titleText, labels, datasets, 'bar');
        } else {
            // 2-parameter analysis: 3D bar chart using Plotly.js
            show3DBarChart(titleText, data, params);
        }
    }
    
    // Show 3D bar chart using Plotly.js
    function show3DBarChart(titleText, data, params) {
        const param1Values = Object.keys(data).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        
        const param2Values = new Set();
        Object.values(data).forEach(row => {
            Object.keys(row).forEach(col => param2Values.add(col));
        });
        const param2ValuesArray = Array.from(param2Values).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        
        // Create individual bars using mesh3d for each data point
        const traces = [];
        
        param1Values.forEach((p1Val, i) => {
            param2ValuesArray.forEach((p2Val, j) => {
                const count = data[p1Val][p2Val] || 0;
                if (count === 0) return; // Skip empty bars
                
                const x0 = j - 0.4;
                const x1 = j + 0.4;
                const y0 = i - 0.4;
                const y1 = i + 0.4;
                const z0 = 0;
                const z1 = count;
                
                // Create a box (bar) using mesh3d
                traces.push({
                    type: 'mesh3d',
                    x: [x0, x0, x1, x1, x0, x0, x1, x1],
                    y: [y0, y1, y1, y0, y0, y1, y1, y0],
                    z: [z0, z0, z0, z0, z1, z1, z1, z1],
                    i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
                    j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
                    k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
                    opacity: 0.8,
                    color: count,
                    colorscale: 'Viridis',
                    showscale: false,
                    hovertemplate: 
                        formatParamValue(params.param1, p1Val) + '<br>' +
                        formatParamValue(params.param2, p2Val) + '<br>' +
                        i18n.analysis_results.count + ': ' + count +
                        '<extra></extra>',
                    showlegend: false
                });
            });
        });
        
        // Add one trace for the colorbar
        const allCounts = [];
        param1Values.forEach(p1Val => {
            param2ValuesArray.forEach(p2Val => {
                const count = data[p1Val][p2Val] || 0;
                if (count > 0) allCounts.push(count);
            });
        });
        
        traces.push({
            type: 'scatter3d',
            x: [null],
            y: [null],
            z: [null],
            mode: 'markers',
            marker: {
                size: 0,
                color: allCounts,
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: i18n.analysis_results.count
                }
            },
            showlegend: false,
            hoverinfo: 'skip'
        });
        
        const layout = {
            title: {
                text: titleText,
                font: { size: 16 }
            },
            scene: {
                xaxis: { 
                    title: i18n.analysis_dialog.param_names[params.param2],
                    tickvals: param2ValuesArray.map((_, i) => i),
                    ticktext: param2ValuesArray.map(v => formatParamValue(params.param2, v))
                },
                yaxis: { 
                    title: i18n.analysis_dialog.param_names[params.param1],
                    tickvals: param1Values.map((_, i) => i),
                    ticktext: param1Values.map(v => formatParamValue(params.param1, v))
                },
                zaxis: { 
                    title: i18n.analysis_results.count
                },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.3 }
                }
            },
            autosize: true,
            margin: { l: 0, r: 0, b: 0, t: 60 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan3d', 'select3d', 'lasso3d']
        };
        
        show3DChartModal(traces, layout, config, 'bar');
    }
    
    // Show 3D chart in a modal using Plotly
    function show3DChartModal(traces, layout, config, chartType) {
        // Remove any existing chart modal
        let oldModal = document.getElementById('chart3DModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // Determine chart title based on type
        const chartTitle = chartType === 'line' ? i18n.button.line_chart : i18n.button.bar_chart;
        
        // Create fresh modal
        const chartModal = document.createElement('div');
        chartModal.id = 'chart3DModal';
        chartModal.className = 'modal fade';
        chartModal.setAttribute('tabindex', '-1');
        chartModal.setAttribute('data-bs-backdrop', 'true');
        chartModal.setAttribute('data-bs-keyboard', 'true');
        chartModal.style.zIndex = '10000';
        chartModal.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${chartTitle}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="height: 600px;">
                        <div id="plotly3DChart" style="width: 100%; height: 100%;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-sm px-4" onclick="window.print()">${i18n.common.print}</button>
                        <button type="button" class="btn btn-secondary btn-sm px-4" id="btn-save-3d-chart">${i18n.common.save}</button>
                        <button type="button" class="btn btn-primary btn-sm px-4" data-bs-dismiss="modal">${i18n.common.ok}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(chartModal);
        
        // Show modal
        const modalInstance = new bootstrap.Modal(chartModal);
        modalInstance.show();
        
        // Prevent ESC key from propagating to parent modal
        chartModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
            }
        });
        
        // Create chart after modal is shown
        chartModal.addEventListener('shown.bs.modal', () => {
            // Set focus to this modal to capture ESC key
            chartModal.focus();
            
            Plotly.newPlot('plotly3DChart', traces, layout, config);
            
            // Setup save button handler
            document.getElementById('btn-save-3d-chart').onclick = () => {
                const filename = chartType === 'line' ? 'analysis_line_chart' : 'analysis_bar_chart';
                Plotly.downloadImage('plotly3DChart', {
                    format: 'png',
                    width: 1200,
                    height: 800,
                    filename: filename
                });
            };
        }, { once: true });
        
        // Clean up on hide
        chartModal.addEventListener('hidden.bs.modal', () => {
            Plotly.purge('plotly3DChart');
        }, { once: true });
    }
    
    // Show 2D chart in a modal using Chart.js
    function showChart2D(titleText, labels, datasets, chartTypeParam) {
        // Remove any existing chart modal
        let oldModal = document.getElementById('chartModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // Determine chart title based on type
        const chartTitle = chartTypeParam === 'line' ? i18n.button.line_chart : i18n.button.bar_chart;
        
        // Create fresh modal
        const chartModal = document.createElement('div');
        chartModal.id = 'chartModal';
        chartModal.className = 'modal fade';
        chartModal.setAttribute('tabindex', '-1');
        chartModal.setAttribute('data-bs-backdrop', 'true');
        chartModal.setAttribute('data-bs-keyboard', 'true');
        chartModal.style.zIndex = '10000';
        chartModal.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${chartTitle}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <canvas id="analysisChart"></canvas>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-sm px-4" onclick="window.print()">${i18n.common.print}</button>
                        <button type="button" class="btn btn-secondary btn-sm px-4" id="btn-save-2d-chart">${i18n.common.save}</button>
                        <button type="button" class="btn btn-primary btn-sm px-4" data-bs-dismiss="modal">${i18n.common.ok}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(chartModal);
        
        // Show modal
        const modalInstance = new bootstrap.Modal(chartModal);
        modalInstance.show();
        
        // Prevent ESC key from propagating to parent modal
        chartModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
            }
        });
        
        // Create chart after modal is shown
        chartModal.addEventListener('shown.bs.modal', () => {
            // Set focus to this modal to capture ESC key
            chartModal.focus();
            
            const ctx = document.getElementById('analysisChart').getContext('2d');
            
            // Destroy existing chart if any
            if (window.analysisChartInstance) {
                window.analysisChartInstance.destroy();
            }
            
            // Create new chart
            window.analysisChartInstance = new Chart(ctx, {
                type: chartTypeParam,
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: {
                            display: true,
                            text: titleText.split('\n'),
                            font: { size: 14 }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            title: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: i18n.analysis_results.count
                            }
                        }
                    }
                }
            });
            
            // Setup save button handler
            document.getElementById('btn-save-2d-chart').onclick = () => {
                const canvas = document.getElementById('analysisChart');
                const filename = chartTypeParam === 'line' ? 'analysis_line_chart.png' : 'analysis_bar_chart.png';
                
                // Create a temporary canvas with white background
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Fill white background
                tempCtx.fillStyle = 'white';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                // Draw the chart on top
                tempCtx.drawImage(canvas, 0, 0);
                
                // Convert to blob and download
                tempCanvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                }, 'image/png');
            };
        }, { once: true });
    }
    
    // Show line chart for analysis result
    function showLineChart() {
        if (!lastAnalysisResult || !lastAnalysisParams) return;

        const result = lastAnalysisResult;
        const params = lastAnalysisParams;
        const data = result.data;
        
        // Build title with parameter names and filters
        const param1Name = i18n.analysis_dialog.param_names[params.param1];
        const param2Name = params.param2 ? i18n.analysis_dialog.param_names[params.param2] : null;
        let titleText;
        
        if (param2Name) {
            titleText = `Parameter: ${param1Name} ${i18n.analysis_results.and} ${param2Name}`;
        } else {
            titleText = `Parameter: ${param1Name}`;
        }
        
        // Add filter restrictions to title
        const restrictions = [];
        if (params.filter1) {
            const filterName = i18n.analysis_dialog.param_names[params.filter1];
            const displayValue = params.filter1_display;
            restrictions.push(`${filterName} = ${displayValue}`);
        }
        if (params.filter2) {
            const filterName = i18n.analysis_dialog.param_names[params.filter2];
            const displayValue = params.filter2_display;
            restrictions.push(`${filterName} = ${displayValue}`);
        }
        if (restrictions.length > 0) {
            titleText += `\n${i18n.analysis_results.restrictions}: ${restrictions.join(', ')}`;
        }
        
        if (!params.param2) {
            // 1-parameter analysis: simple 2D line chart using Chart.js
            // data is an array of {key: value, count: number}
            const labels = data.map(item => formatParamValue(params.param1, item.key));
            const counts = data.map(item => item.count);
            
            const datasets = [{
                label: i18n.analysis_results.count,
                data: counts,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }];
            
            showChart2D(titleText, labels, datasets, 'line');
        } else {
            // 2-parameter analysis: 3D surface chart using Plotly.js
            show3DSurfaceChart(titleText, data, params);
        }
    }
    
    // Show 3D surface chart using Plotly.js
    function show3DSurfaceChart(titleText, data, params) {
        const param1Values = Object.keys(data).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        
        const param2Values = new Set();
        Object.values(data).forEach(row => {
            Object.keys(row).forEach(col => param2Values.add(col));
        });
        const param2ValuesArray = Array.from(param2Values).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        
        // Build Z matrix for surface plot
        const zMatrix = [];
        param1Values.forEach(p1Val => {
            const row = [];
            param2ValuesArray.forEach(p2Val => {
                row.push(data[p1Val][p2Val] || 0);
            });
            zMatrix.push(row);
        });
        
        const trace = {
            type: 'surface',
            x: param2ValuesArray.map(v => formatParamValue(params.param2, v)),
            y: param1Values.map(v => formatParamValue(params.param1, v)),
            z: zMatrix,
            colorscale: 'Viridis',
            showscale: true,
            colorbar: {
                title: i18n.analysis_results.count
            },
            hovertemplate: 
                i18n.analysis_dialog.param_names[params.param1] + ': %{y}<br>' +
                i18n.analysis_dialog.param_names[params.param2] + ': %{x}<br>' +
                i18n.analysis_results.count + ': %{z}<br>' +
                '<extra></extra>'
        };
        
        const layout = {
            title: {
                text: titleText,
                font: { size: 16 }
            },
            scene: {
                xaxis: { 
                    title: i18n.analysis_dialog.param_names[params.param2]
                },
                yaxis: { 
                    title: i18n.analysis_dialog.param_names[params.param1]
                },
                zaxis: { 
                    title: i18n.analysis_results.count
                },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.3 }
                }
            },
            autosize: true,
            margin: { l: 0, r: 0, b: 0, t: 60 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan3d', 'select3d', 'lasso3d']
        };
        
        show3DChartModal([trace], layout, config, 'line');
    }
    
    
    // Save analysis result to CSV file
    function saveAnalysisResult() {
        if (!lastAnalysisResult || !lastAnalysisParams) return;

        // Generate filename based on parameters
        const param1 = lastAnalysisParams.param1;
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `analysis_${param1}_${timestamp}.csv`;

        // Generate CSV content
        const csv = generateAnalysisCsv();

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function escapeCsv(value) {
        const text = String(value ?? '');
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
            return '"' + text.replaceAll('"', '""') + '"';
        }
        return text;
    }

    // Generate CSV version of analysis result (title + table)
    function generateAnalysisCsv() {
        if (!lastAnalysisResult || !lastAnalysisParams) return '';

        const params = lastAnalysisParams;
        const result = lastAnalysisResult;

        const param1Name = i18n.analysis_dialog.param_names[params.param1];
        const param2Name = params.param2 ? i18n.analysis_dialog.param_names[params.param2] : '';
        const titleText = params.param2
            ? `${i18n.analysis_results.title_two_params}: ${param1Name} ${i18n.analysis_results.and} ${param2Name}`
            : `${i18n.analysis_results.title_one_param}: ${param1Name}`;

        const restrictions = [];
        if (params.filter1) {
            const filterName = i18n.analysis_dialog.param_names[params.filter1];
            restrictions.push(`${filterName} = ${params.filter1_value}`);
        }
        if (params.filter2) {
            const filterName = i18n.analysis_dialog.param_names[params.filter2];
            restrictions.push(`${filterName} = ${params.filter2_value}`);
        }

        const lines = [];
        lines.push(escapeCsv(titleText));
        if (restrictions.length > 0) {
            lines.push(escapeCsv(`${i18n.analysis_results.restrictions}: ${restrictions.join(', ')}`));
        }
        lines.push('');

        if (!params.param2) {
            // Single-parameter table
            lines.push([param1Name, `${i18n.analysis_results.count} (Σ=${result.total} ${i18n.analysis_results.observations})`].map(escapeCsv).join(','));
            for (const item of result.data) {
                const displayKey = formatParamValue(params.param1, item.key);
                const percentage = result.total > 0 ? ((item.count / result.total) * 100).toFixed(1) : '0.0';
                lines.push([displayKey, `${item.count} (${percentage}%)`].map(escapeCsv).join(','));
            }
        } else {
            // Two-parameter cross-tab
            const data = result.data;

            // Collect sorted param2 values (columns)
            const param2Values = new Set();
            Object.values(data).forEach(row => {
                Object.keys(row).forEach(col => param2Values.add(col));
            });
            const columns = Array.from(param2Values).sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });

            // Column totals
            const columnTotals = {};
            columns.forEach(col => {
                columnTotals[col] = 0;
                Object.values(data).forEach(row => {
                    columnTotals[col] += row[col] !== undefined ? row[col] : 0;
                });
            });

            // Header row
            const header = [param1Name, `${param2Name} Σ (Σ=${result.total})`];
            columns.forEach(col => {
                const colTotal = columnTotals[col];
                const colPercentage = result.total > 0 ? ((colTotal / result.total) * 100).toFixed(1) : '0.0';
                const colLabel = formatParamValue(params.param2, col);
                header.push(`${colLabel} (Σ=${colTotal} - ${colPercentage}%)`);
            });
            lines.push(header.map(escapeCsv).join(','));

            // Rows
            const param1Values = Object.keys(data).sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });

            param1Values.forEach(param1Val => {
                const rowData = data[param1Val];
                let rowTotal = 0;
                columns.forEach(col => {
                    rowTotal += rowData[col] !== undefined ? rowData[col] : 0;
                });
                const rowPercentage = result.total > 0 ? ((rowTotal / result.total) * 100).toFixed(1) : '0.0';
                const rowLabel = formatParamValue(params.param1, param1Val);

                const row = [rowLabel, `${rowTotal} (${rowPercentage}%)`];
                columns.forEach(col => {
                    const val = rowData[col] !== undefined ? rowData[col] : 0;
                    row.push(val);
                });
                lines.push(row.map(escapeCsv).join(','));
            });

            // Totals row
            const totalsRow = [i18n.analysis_results.total, `${result.total} (100%)`];
            columns.forEach(col => {
                const colTotal = columnTotals[col];
                const colPercentage = result.total > 0 ? ((colTotal / result.total) * 100).toFixed(1) : '0.0';
                totalsRow.push(`${colTotal} (${colPercentage}%)`);
            });
            lines.push(totalsRow.map(escapeCsv).join(','));
        }

        return lines.join('\n');
    }
    
    // Export/Import functions - deactivated for now, may be needed later
    /*
    function exportAnalysisResult() {
        // TODO: Implement export functionality
        console.log('Export analysis result');
    }
    
    function importAnalysisResult() {
        // TODO: Implement import functionality
        console.log('Import analysis result');
    }
    */
    
    // Build single parameter result table
    function buildSingleParameterTable(data, paramName, total, paramCode) {
        let html = `
            <table class="table table-bordered analysis-table">
                <thead>
                    <tr>
                        <th>${paramName}</th>
                        <th>${i18n.analysis_results.count} (Σ=${total} ${i18n.analysis_results.observations})</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // data is now an array of {key, count} objects, preserving sort order from backend
        for (const item of data) {
            const key = item.key;
            const count = item.count;
            const displayKey = formatParamValue(paramCode, key);
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            html += `
                <tr>
                    <td>${displayKey}</td>
                    <td class="text-end">${count} ${i18n.analysis_results.observation_s} - ${percentage}%</td>
                </tr>
            `;
        }
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }
    
    // Build two parameter cross-tabulation table
    function buildTwoParameterTable(data, param1Name, param2Name, total, percentageMode, param1Code, param2Code) {
        // Extract all unique param2 values (columns) and sort them
        const param2Values = new Set();
        Object.values(data).forEach(row => {
            Object.keys(row).forEach(col => param2Values.add(col));
        });
        const columns = Array.from(param2Values).sort((a, b) => {
            // Try numeric sort first
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        
        // Calculate column totals
        const columnTotals = {};
        columns.forEach(col => {
            columnTotals[col] = 0;
            Object.values(data).forEach(row => {
                const val = row[col] !== undefined ? row[col] : 0;
                columnTotals[col] += val;
            });
        });
        
        // Build table header
        let html = `
            <table class="table table-bordered analysis-table">
                <thead>
                    <tr>
                        <th>${param1Name}</th>
                        <th>${param2Name}</th>
        `;
        
        // Add column headers with totals
        columns.forEach(col => {
            const colTotal = columnTotals[col];
            const colPercentage = total > 0 ? ((colTotal / total) * 100).toFixed(1) : '0.0';
            const colLabel = formatParamValue(param2Code, col);
            html += `<th>${colLabel}<br/>(Σ=${colTotal} - ${colPercentage}%)</th>`;
        });
        
        html += `
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Build table rows
        const param1Values = Object.keys(data).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        
        param1Values.forEach(param1Val => {
            const rowData = data[param1Val];
            
            // Calculate row total
            let rowTotal = 0;
            columns.forEach(col => {
                rowTotal += rowData[col] !== undefined ? rowData[col] : 0;
            });
            
            const rowPercentage = total > 0 ? ((rowTotal / total) * 100).toFixed(1) : '0.0';
            const rowLabel = formatParamValue(param1Code, param1Val);
            
            html += `
                <tr>
                    <td>${rowLabel}</td>
                    <td class="text-end">(Σ=${rowTotal} - ${rowPercentage}%)</td>
            `;
            
            // Add data cells with percentages
            columns.forEach(col => {
                const count = rowData[col] !== undefined ? rowData[col] : 0;
                let percentage;
                
                // Calculate percentage based on mode
                if (percentageMode === 'param1') {
                    // Row percentage - each row sums to 100%
                    percentage = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(1) : '0.0';
                } else if (percentageMode === 'param2') {
                    // Column percentage - each column sums to 100%
                    const colTotal = columnTotals[col];
                    percentage = colTotal > 0 ? ((count / colTotal) * 100).toFixed(1) : '0.0';
                } else {
                    // Global percentage - based on grand total
                    percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                }
                
                html += `<td class="text-end">${count} ${i18n.analysis_results.observation_abbr} - ${percentage}%</td>`;
            });
            
            html += `</tr>`;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }

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
    
    // Disable filter2 and OK button initially
    filter2Select.disabled = true;
    btnApplyParam.disabled = true;
    
    // Show parameter dialog on load
    const modal = new bootstrap.Modal(paramDialog);
    modal.show();
});
