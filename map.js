// Map dimensions and projection
const width = document.getElementById('map').clientWidth;
const height = document.getElementById('map').clientHeight;
const projection = d3.geoMercator()
    .scale(width / 2 / Math.PI)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Create SVG
const svg = d3.select('#map')
    .attr('width', width)
    .attr('height', height);

// Add background (water)
svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'var(--water-color)');

// Load world map data
d3.json('data/countries-110m.json')
    .then(data => {
        const countries = topojson.feature(data, data.objects.countries);
        
        // Draw countries (land)
        svg.append('g')
            .selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'land')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5);
        
        // Start the animation
        updateTerminator();
        setInterval(updateTerminator, 1000);
    });

// Update time display
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString();
}

// Calculate and draw the terminator
function updateTerminator() {
    const now = new Date();
    const jd = getJulianDate(now);
    const sunPos = getSubsolarPoint(jd, now);
    const subsolarLon = sunPos.longitude;
    const subsolarLat = sunPos.latitude;

    // Create terminator points using the accurate formula
    const terminatorPoints = [];
    for (let lon = -180; lon <= 180; lon += 1) {
        const lat = calculateTerminatorLatitudeAccurate(lon, subsolarLon, subsolarLat);
        terminatorPoints.push([lon, lat]);
    }

    // Build the night region polygon (from -180 to 180, then down to -90, across, and back up)
    const nightPolygon = [];
    // Top edge (from -180,90 to 180,90)
    nightPolygon.push([-180, 90]);
    nightPolygon.push(...terminatorPoints);
    nightPolygon.push([180, 90]);
    nightPolygon.push([180, -90]);
    nightPolygon.push([-180, -90]);
    nightPolygon.push([-180, 90]);

    // Remove previous night region and terminator
    svg.selectAll('.night-region').remove();
    svg.selectAll('.terminator').remove();

    // Draw night region
    svg.append('path')
        .datum({type: 'Polygon', coordinates: [nightPolygon]})
        .attr('class', 'night-region')
        .attr('d', path);

    // Draw new terminator
    svg.append('path')
        .datum({type: 'LineString', coordinates: terminatorPoints})
        .attr('class', 'terminator')
        .attr('d', path)
        .attr('stroke', '#666')
        .attr('stroke-width', 2)
        .attr('fill', 'none');

    // Update time display
    updateTime();
}

// Julian date calculation
function getJulianDate(date) {
    return (date.getTime() / 86400000) + 2440587.5;
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
    const EoT = L - 0.0057183 - lambda + 2.466 * Math.sin(2 * lambda * Math.PI / 180) - 0.053 * Math.sin(4 * lambda * Math.PI / 180);
    // Current UTC time in minutes
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    // Subsolar longitude
    const subsolarLon = ((720 - utcMinutes - EoT) / 4) % 360;
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