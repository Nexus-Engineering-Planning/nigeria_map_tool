# Nigeria Map Tool

An interactive web-based map application for exploring Nigeria's administrative divisions including States, Local Government Areas (LGAs), Wards, and Senatorial Districts.

## Features

- **Interactive Leaflet Map**: Pan, zoom, and explore Nigeria's geography
- **Multiple Basemap Options**: OpenStreetMap, Esri World Imagery, CartoDB Positron
- **Multi-level Filtering**:
  - Filter by State, LGA, or Ward
  - Filter by Senatorial District
- **Dynamic Search**: Real-time search across all administrative levels
- **Layer Toggle**: Show/hide States, LGAs, and Wards layers
- **Collapsible Sidebar**: Responsive design with mobile support
- **Error Handling**: User-friendly error messages with recovery options

## File Structure

```
nigeria_map_tool/
├── index.html                 # Main HTML entry point
├── package.json              # Project dependencies and metadata
├── README.md                 # This file
│
├── js/                       # JavaScript modules
│   ├── main.js              # Application entry point and initialization
│   ├── MapManager.js        # Singleton map instance manager
│   ├── mappings.js          # Data mapping utilities
│   ├── manualLgaCorrections.js  # LGA name correction mappings
│   ├── sidebar.js           # Sidebar UI controls and events
│   ├── layers.js            # Map layer selection functions
│   └── utils.js             # Utility functions
│
├── data/                     # GeoJSON and data files
│   ├── state_geojson.geojson    # State boundaries
│   ├── lga_geojson.geojson      # LGA boundaries
│   ├── ward_geojson.geojson     # Ward boundaries
│   └── senatorial.json          # Senatorial district mappings
│
├── styles/
│   └── styles.css           # Application styles
│
└── assets/                   # Images and other assets
```

## Prerequisites

- **Python 3.x** (for local development server)
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
- **NPM** (optional, for package management)

## Setup and Installation

### 1. Clone or Download the Repository

```bash
git clone https://github.com/femiolamijulo/nigeria_map_tool.git
cd nigeria_map_tool
```

### 2. Install Dependencies (Optional)

If you want to use npm for dependency management:

```bash
npm install
```

Note: The application uses CDN-hosted libraries (Leaflet), so npm installation is optional.

### 3. Start a Local Development Server

Due to browser security restrictions with ES6 modules, you need to serve the files via HTTP:

**Option A - Using Python:**
```bash
python -m http.server 8000
```

**Option B - Using npm:**
```bash
npm start
```

**Option C - Using Node.js http-server:**
```bash
npx http-server -p 8000
```

### 4. Open in Browser

Navigate to: `http://localhost:8000`

The map should load with all GeoJSON data from the `data/` directory.

## Usage Instructions

### Filtering the Map

1. **State Filter**:
   - Select a State from the dropdown
   - The map highlights the selected State
   - LGA and Senatorial District dropdowns populate with options for that State

2. **Senatorial District Filter**:
   - After selecting a State, choose a Senatorial District
   - The map highlights all LGAs within that district

3. **LGA Filter**:
   - Select a Local Government Area
   - The map highlights the LGA and populates the Ward dropdown

4. **Ward Filter**:
   - Select a Ward to highlight it on the map

### Search Functionality

- Type in the search box to find States, LGAs, or Wards
- Results are grouped by type (State, LGA, Ward)
- Click on any result to zoom to that location

### Layer Toggles

- Use the checkboxes to show/hide:
  - **States** - State boundary layers
  - **LGAs** - Local Government Area layers
  - **Wards** - Ward boundary layers

### Basemap Selection

- Click the layer control (top-right corner) to switch basemaps:
  - OpenStreetMap Standard
  - Esri World Imagery
  - CartoDB Positron

### Reset

- Click "Reset Filters" to clear all selections and return to the initial view

## Architecture

### Module Structure

- **main.js**: Application entry point, handles data loading and initialization
- **MapManager.js**: Singleton class managing the Leaflet map instance and layers
- **mappings.js**: Builds relationships between States, LGAs, Wards, and Senatorial Districts
- **manualLgaCorrections.js**: Handles LGA name variations and spelling corrections
- **sidebar.js**: Manages UI controls and event handlers
- **layers.js**: Functions for selecting and highlighting geographic features
- **utils.js**: Utility functions (currently contains Turf.js geometry utilities)

### Data Flow

1. **Data Loading**: GeoJSON files are fetched in parallel
2. **Mapping**: Relationships are built between administrative levels
3. **Layer Initialization**: Map layers are created from GeoJSON
4. **UI Setup**: Sidebar controls are populated with data
5. **Interaction**: User selections trigger layer highlighting and filtering

## Customization

### Styling

Modify [styles/styles.css](styles/styles.css) to customize:
- Sidebar appearance
- Button styles
- Loading spinner
- Color scheme

### Map Configuration

Edit [js/MapManager.js](js/MapManager.js) to change:
- Initial map center and zoom: Line 6
- Basemap options: Lines 9-22
- Layer styles: Lines 74-95

### Adding New Basemaps

In [js/MapManager.js](js/MapManager.js), add to the `baseMaps` object:

```javascript
this.baseMaps = {
  "OpenStreetMap Standard": this.osmStandard,
  "Your New Basemap": L.tileLayer('https://your-tile-url/{z}/{x}/{y}.png', {
    attribution: 'Your attribution'
  })
};
```

## Troubleshooting

### Common Issues

1. **Map Not Displaying**
   - Ensure you're serving via HTTP (not opening `index.html` directly)
   - Check browser console for errors (F12)
   - Verify all GeoJSON files exist in `data/` directory

2. **"Failed to load map data" Error**
   - Confirm GeoJSON files are valid JSON
   - Check network tab in browser DevTools for 404 errors
   - Ensure server is running and files are accessible

3. **Module Import Errors**
   - Use a local web server (Python, npm, etc.)
   - ES6 modules require HTTP protocol

4. **Slow Performance**
   - Disable ward layer if not needed (774 LGAs × multiple wards)
   - Consider simplifying GeoJSON geometry
   - Use lower zoom levels for initial view

5. **Senatorial Districts Not Showing**
   - Check [js/manualLgaCorrections.js](js/manualLgaCorrections.js) for LGA name mappings
   - Some LGA names may need manual correction entries

## Dependencies

### Runtime Dependencies

- **[Leaflet.js](https://leafletjs.com/)** v1.9.3 - Interactive mapping library
- **[@turf/turf](https://turfjs.org/)** v7.1.0 - Geospatial analysis (used in utils.js)

### Basemap Providers

- **OpenStreetMap** - Default street map
- **Esri World Imagery** - Satellite imagery
- **CartoDB Positron** - Light theme basemap

### Data Credits

Admin boundary data from eHealth Africa and Proxy Logics. 2020. Nigeria Operational Ward Boundaries. Geo-Referenced Infrastructure and Demographic Data for Development (GRID3). https://grid3.gov.ng/.

## Development

### Adding New Features

1. Create feature branch: `git checkout -b feature-name`
2. Make changes and test locally
3. Ensure no console errors in browser DevTools
4. Submit pull request with description

### Code Style

- Use ES6 modules and modern JavaScript
- Follow existing naming conventions
- Add comments for complex logic
- Keep console logs minimal (development only)

## Contributing

Contributions are welcome! Please:
- Open an issue to discuss major changes
- Follow the existing code structure
- Test your changes thoroughly
- Update documentation as needed

## License

This project is licensed under the **MIT License**.

## Contact Information

For questions or support, please contact:

- **Olufemi Olamijulo**
- **Email**: lamijulo99@gmail.com
- **GitHub**: [femiolamijulo](https://github.com/femiolamijulo)

---

Feel free to customize this README to better suit your project's specifics. Include any additional information that might be helpful for users or contributors.

If you have any questions or need further assistance, please let me know!