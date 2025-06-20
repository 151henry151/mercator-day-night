# Mercator Day/Night Terminator Map

A real-time visualization of Earth's day/night boundary using D3.js and TopoJSON.

## Description

This interactive web application displays the current boundary between day and night on Earth in real-time. The map shows:

- **Day/Night Boundary**: The curved line (terminator) where the sun is either rising or setting
- **Real-time Updates**: Current time and date display
- **Interactive Visualization**: Built with D3.js for smooth, responsive rendering
- **Geographic Accuracy**: Uses TopoJSON for precise world map data

## Features

- Real-time day/night terminator visualization
- Current time and date display
- Responsive design
- Educational information about Earth's axial tilt and seasons
- Clean, modern UI

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript
- **Visualization**: D3.js v7
- **Geographic Data**: TopoJSON v3
- **Dependencies**: Loaded via CDN (no local installation required)

## Usage

Simply open `index.html` in a web browser. The application will automatically:

1. Load the required D3.js and TopoJSON libraries
2. Render the world map with current day/night boundary
3. Display current time and date
4. Update the visualization in real-time

## Files

- `index.html` - Main HTML file with the application structure
- `style.css` - Styling for the user interface
- `map.js` - JavaScript code for map rendering and day/night calculations
- `data/countries-110m.json` - TopoJSON geographic data for world countries

## Live Demo

Visit the live application at: [https://hromp.com/mercator/](https://hromp.com/mercator/)

## License

This project is open source and available under the MIT License.

## Author

Created by [hromp.com](https://hromp.com)
