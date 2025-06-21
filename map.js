// Global variables for map state
let width, height, projection, path, svg;
let worldData = null;
let resizeTimeout = null;
let selectedDate = new Date(); // Track the selected date
let isUsingCustomDate = false; // Flag to indicate if we're using a custom date
let mapContainer;

// Initialize the map
function initMap() {
    mapContainer = document.getElementById('map-container');
    updateDimensions();
    createSVG();
    loadWorldData();
    initDatePicker();
}

// Initialize the date picker
function initDatePicker() {
    const datePicker = document.getElementById('date-picker');
    const resetButton = document.getElementById('reset-date');
    const viewMonthButton = document.getElementById('view-month');
    const viewYearButton = document.getElementById('view-year');
    const closeMiniMapsButton = document.getElementById('close-mini-maps');
    
    // Set the date picker to today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    datePicker.value = todayString;
    
    // Add event listeners
    datePicker.addEventListener('change', handleDateChange);
    resetButton.addEventListener('click', resetToToday);
    viewMonthButton.addEventListener('click', showFullMonth);
    viewYearButton.addEventListener('click', showFullYear);
    closeMiniMapsButton.addEventListener('click', hideMiniMaps);
}

// Handle date picker change
function handleDateChange(event) {
    const dateString = event.target.value;
    const datePicker = event.target;
    
    if (dateString) {
        // Create a new date object from the selected date
        const selectedDateObj = new Date(dateString);
        
        // Keep the current time but use the selected date
        const now = new Date();
        selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        
        selectedDate = selectedDateObj;
        isUsingCustomDate = true;
        
        // Add visual indicator
        datePicker.classList.add('custom-date');
        
        // Update the terminator immediately
        updateTerminator();
    }
}

// Reset to today's date
function resetToToday() {
    selectedDate = new Date();
    isUsingCustomDate = false;
    
    // Update the date picker to show today
    const datePicker = document.getElementById('date-picker');
    const todayString = selectedDate.toISOString().split('T')[0];
    datePicker.value = todayString;
    
    // Remove visual indicator
    datePicker.classList.remove('custom-date');
    
    // Update the terminator immediately
    updateTerminator();
    hideMiniMaps();
}

// Update dimensions based on current container size
function updateDimensions() {
    const mapElement = document.getElementById('map');
    width = mapElement.clientWidth;
    height = mapElement.clientHeight;
    
    // Update projection with new dimensions
    projection = d3.geoMercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2]);
    
    path = d3.geoPath().projection(projection);
}

// Create or update SVG
function createSVG() {
    d3.select('#map').selectAll('*').remove();
    svg = d3.select('#map')
        .attr('width', width)
        .attr('height', height);

    svg.append('defs').append('clipPath')
        .attr('id', 'day-clip')
      .append('path')
        .attr('id', 'day-clip-path');

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'var(--water-color-night)');
}

// Load world map data
function loadWorldData() {
    d3.json('data/countries-110m.json')
        .then(data => {
            worldData = data;
            drawWorldMap(false);
            drawWorldMap(true);
            updateTerminator();
            startTimer();
        });
}

// Draw the world map
function drawWorldMap(isDayView = false) {
    if (!worldData) return;
    
    const group = svg.append('g');
    if (isDayView) {
        group.attr('clip-path', 'url(#day-clip)');
        group.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'var(--water-color)');
    }
    
    const countries = topojson.feature(worldData, worldData.objects.countries);
    
    group.append('g')
        .selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', isDayView ? 'land' : 'land-night');
}

// Handle window resize with debouncing
function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
        updateDimensions();
        createSVG();
        drawWorldMap(false);
        drawWorldMap(true);
        updateTerminator();
    }, 100);
}

// Initialize the map when the page loads
initMap();

// Add resize event listener
window.addEventListener('resize', handleResize);

// Update time display
function updateTime() {
    const displayDate = isUsingCustomDate ? selectedDate : new Date();
    document.getElementById('current-time').textContent = displayDate.toLocaleTimeString();
    document.getElementById('current-date').textContent = displayDate.toLocaleDateString();
}

// Calculate and draw the terminator
function updateTerminator() {
    const displayDate = isUsingCustomDate ? selectedDate : new Date();
    const jd = getJulianDate(displayDate);
    const sunPos = getSubsolarPoint(jd, displayDate);

    const day = d3.geoCircle().center([sunPos.longitude, sunPos.latitude]).radius(90);

    svg.select('#day-clip-path')
        .datum(day())
        .attr('d', path);

    svg.selectAll('.terminator').remove();
    svg.append('path')
        .datum(day())
        .attr('class', 'terminator')
        .attr('d', path);

    updateTime();
}

// Julian date calculation
function getJulianDate(date) {
    return (date.getTime() / 86400000) + 2440587.5;
}

function dayOfYear(date) {
    return (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
}

// Calculate subsolar point (longitude and latitude)
function getSubsolarPoint(jd, date) {
    // Number of days since J2000.0
    const n = jd - 2451545.0;
    // Mean longitude of the Sun
    const L = (280.46 + 0.9856474 * n) % 360;
    // Mean anomaly of the Sun
    const g = (357.528 + 0.9856003 * n) % 360;
    // Ecliptic longitude of the Sun
    const lambda = L + 1.915 * Math.sin(g * Math.PI / 180) + 0.02 * Math.sin(2 * g * Math.PI / 180);
    // Obliquity of the ecliptic
    const epsilon = 23.439 - 0.0000004 * n;
    // Declination (latitude) of the subsolar point
    const delta = Math.asin(Math.sin(epsilon * Math.PI / 180) * Math.sin(lambda * Math.PI / 180)) * 180 / Math.PI;
    
    // Equation of time (in minutes)
    const B = (360 / 365.24) * (dayOfYear(date) - 81) * (Math.PI / 180);
    const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

    // Current UTC time in minutes
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    // Subsolar longitude
    const subsolarLon = (720 - utcMinutes - EoT) / 4;
    return { longitude: subsolarLon, latitude: delta };
}

// Accurate terminator latitude calculation
function calculateTerminatorLatitudeAccurate(lon, subsolarLon, subsolarLat) {
    // Convert to radians
    const lambda = lon * Math.PI / 180;
    const lambda_s = subsolarLon * Math.PI / 180;
    const delta = subsolarLat * Math.PI / 180;
    // Formula for the latitude of the terminator
    const phi = Math.atan(-Math.cos(lambda - lambda_s) / Math.tan(delta));
    return phi * 180 / Math.PI;
}

// Start the timer for real-time updates
function startTimer() {
    setInterval(() => {
        // Only update if we're not using a custom date
        if (!isUsingCustomDate) {
            updateTerminator();
        }
    }, 1000);
}

// Show full month view
function showFullMonth() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date(); // Get current time
    
    const miniMapsContainer = document.getElementById('mini-maps-container');
    const grid = document.getElementById('mini-maps-grid');
    const title = document.getElementById('mini-maps-title');
    
    title.textContent = `${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Day/Night Terminators`;
    grid.className = 'mini-maps-grid month-view';
    grid.innerHTML = '<div class="loading-indicator">Generating month view...</div>';
    
    mapContainer.classList.add('viewing-mini-maps');
    miniMapsContainer.classList.add('loading');
    
    // Generate maps asynchronously
    setTimeout(() => {
        grid.innerHTML = '';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); // Set current time
            const mapItem = createMiniMap(date, day);
            grid.appendChild(mapItem);
        }
        
        miniMapsContainer.classList.remove('loading');
    }, 100);
}

// Show full year view
function showFullYear() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const dayOfMonth = 15; // Use the 15th of the month to avoid equinox artifacts
    const now = new Date(); // Get current time

    const miniMapsContainer = document.getElementById('mini-maps-container');
    const grid = document.getElementById('mini-maps-grid');
    const title = document.getElementById('mini-maps-title');

    title.textContent = `${year} - Monthly Terminators`;
    grid.className = 'mini-maps-grid year-view';
    grid.innerHTML = '<div class="loading-indicator">Generating monthly view...</div>';

    mapContainer.classList.add('viewing-mini-maps');
    miniMapsContainer.classList.add('loading');

    // Generate maps asynchronously
    setTimeout(() => {
        grid.innerHTML = '';

        // Generate a map for each of the 12 months
        for (let month = 0; month < 12; month++) {
            // Use the 15th day for a consistent monthly snapshot
            const dayToShow = 15;
            
            const date = new Date(year, month, dayToShow);
            date.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); // Set current time
            const monthName = date.toLocaleDateString('en-US', { month: 'long' });
            
            const mapItem = createMiniMap(date, monthName);
            grid.appendChild(mapItem);
        }

        miniMapsContainer.classList.remove('loading');
    }, 100);
}

// Hide miniature maps
function hideMiniMaps() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.classList.remove('viewing-mini-maps');
}

// Create a miniature map for a specific date
function createMiniMap(date, label) {
    const mapItem = document.createElement('div');
    mapItem.className = 'mini-map-item';
    mapItem.style.cursor = 'pointer';
    mapItem.addEventListener('click', () => {
        const newSelectedDate = new Date(date);
        const now = new Date();
        // We need to make sure the time from the mini-map's date object is preserved
        newSelectedDate.setHours(date.getHours(), date.getMinutes(), date.getSeconds());

        selectedDate = newSelectedDate;
        isUsingCustomDate = true;
        
        const datePicker = document.getElementById('date-picker');
        datePicker.value = selectedDate.toISOString().split('T')[0];
        datePicker.classList.add('custom-date');
        
        updateTerminator();
        hideMiniMaps();
    });
    
    const title = document.createElement('h4');
    // The label can be a string (month name) or a number (day of month)
    if (typeof label === 'string') {
        title.textContent = label;
    } else {
        title.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svg = d3.select(svgNode)
        .attr('viewBox', '0 0 120 80')
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const miniWidth = 120, miniHeight = 80;
    const miniProjection = d3.geoMercator().scale(miniWidth / 2 / Math.PI).translate([miniWidth / 2, miniHeight / 2]);
    const miniPath = d3.geoPath().projection(miniProjection);

    const clipId = 'mini-clip-' + Math.random().toString(36).substr(2, 9);
    svg.append('defs').append('clipPath')
        .attr('id', clipId)
      .append('path')
        .attr('d', miniPath(d3.geoCircle().center([0, 0]).radius(90)()));

    svg.append('rect')
        .attr('width', miniWidth)
        .attr('height', miniHeight)
        .attr('fill', 'var(--water-color-night)');

    const countries = topojson.feature(worldData, worldData.objects.countries);
    svg.append('g').selectAll('path')
        .data(countries.features).enter().append('path')
        .attr('d', miniPath)
        .attr('class', 'land-night');

    const dayGroup = svg.append('g').attr('clip-path', `url(#${clipId})`);
    dayGroup.append('rect')
        .attr('width', miniWidth)
        .attr('height', miniHeight)
        .attr('fill', 'var(--water-color)');
    dayGroup.append('g').selectAll('path')
        .data(countries.features).enter().append('path')
        .attr('d', miniPath)
        .attr('class', 'land');

    const sunPos = getSubsolarPoint(getJulianDate(date), date);
    const day = d3.geoCircle().center([sunPos.longitude, sunPos.latitude]).radius(90);
    svg.select(`#${clipId} path`).datum(day()).attr('d', miniPath);
    
    svg.append('path')
        .datum(day())
        .attr('d', miniPath)
        .attr('class', 'terminator');

    mapItem.appendChild(title);
    mapItem.appendChild(svgNode);
    return mapItem;
} 