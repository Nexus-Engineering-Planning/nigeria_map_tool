import MapManager from '../MapManager.js';

const mapManager = MapManager.getInstance();
const svg = d3.select("#map");

// Create a group for zooming and panning
const g = svg.append("g");

// Define zoom behavior
const zoom = d3.zoom()
    .scaleExtent([1, 8]) // Zoom range between 1x and 8x
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });

// Apply zoom behavior to the SVG
svg.call(zoom);

function zoomToFeature(features) {
    if (!features || features.length === 0) return;

    const projection = d3.geoMercator()
        .center([8.6753, 9.0820])
        .scale(2500)
        .translate([svg.node().clientWidth / 2, svg.node().clientHeight / 2]);

    const path = d3.geoPath().projection(projection);

    // Compute the bounding box of the selected feature
    const [[x0, y0], [x1, y1]] = path.bounds(features[0]);

    // Calculate new zoom scale and translate position
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const scale = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
    const translateX = (width - scale * (x1 + x0)) / 2;
    const translateY = (height - scale * (y1 + y0)) / 2;

    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
}

function selectState(stateName) {
    const geojsonData = mapManager.getStateGeoJSON();
    if (!geojsonData || !geojsonData.features) {
        console.error("❌ State GeoJSON data is missing.");
        return;
    }

    let stateFeatures = stateName 
        ? geojsonData.features.filter(f => f.properties.statename === stateName)
        : geojsonData.features;

    console.log("📌 Selected State Features:", stateFeatures);
    updateLayer(stateFeatures, "blue");

    zoomToFeature(stateFeatures); // Zoom to selected state

    if (stateName) {
        selectLGAsInState(stateName);
    } else {
        clearLayers("lga");
        clearLayers("ward");
    }
}

function selectLGAsInState(stateName) {
    const geojsonData = mapManager.getLgaGeoJSON();
    if (!geojsonData || !geojsonData.features) {
        console.error("❌ LGA GeoJSON data is missing.");
        return;
    }

    const lgaFeatures = geojsonData.features.filter(f => f.properties.statename === stateName);
    console.log("📌 LGAs in Selected State:", lgaFeatures);

    if (lgaFeatures.length === 0) {
        console.warn(`⚠️ No LGAs found for state: ${stateName}`);
        return;
    }

    clearLayers("lga");
    updateLayer(lgaFeatures, "red");

    zoomToFeature(lgaFeatures); // Zoom to selected LGA
}

function selectWardsInLGA(lgaCode) {
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) {
        console.error("❌ Ward GeoJSON data is missing.");
        return;
    }

    const wardFeatures = geojsonData.features.filter(f => f.properties.lgacode === lgaCode);
    console.log("📌 Wards in Selected LGA:", wardFeatures);

    if (wardFeatures.length === 0) {
        console.warn(`⚠️ No Wards found for LGA Code: ${lgaCode}`);
        return;
    }

    clearLayers("ward");
    updateLayer(wardFeatures, "green");

    zoomToFeature(wardFeatures); // Zoom to selected ward
}

function selectWard(wardCode) {
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) {
        console.error("❌ Ward GeoJSON data is missing.");
        return;
    }

    const wardFeature = geojsonData.features.find(f => f.properties.wardcode === wardCode);
    if (!wardFeature) {
        console.warn(`⚠️ No ward found for wardcode: ${wardCode}`);
        return;
    }

    console.log("📌 Selected Ward Feature:", wardFeature);
    
    clearLayers("ward");
    updateLayer([wardFeature], "purple"); // Highlight selected ward
    zoomToFeature([wardFeature]); // Zoom to selected ward
}


function updateLayer(features, color) {
    const projection = d3.geoMercator()
        .center([8.6753, 9.0820])
        .scale(2500)
        .translate([svg.node().clientWidth / 2, svg.node().clientHeight / 2]);

    const path = d3.geoPath().projection(projection);

    let paths = g.selectAll("path")
        .data(features, d => d.properties?.wardcode || d.properties?.lgacode || d.properties?.statename);

    paths.enter()
        .append("path")
        .merge(paths)
        .attr("d", path)
        .attr("fill", color)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5) // Reduced stroke width
        .on("mouseover", function () { d3.select(this).attr("fill", "yellow"); })
        .on("mouseout", function () { d3.select(this).attr("fill", color); })
        .on("click", function (event, d) {
            console.log("📌 Clicked Feature:", d.properties);
            if (d.properties.lgacode) {
                selectWardsInLGA(d.properties.lgacode);
            } else if (d.properties.statename) {
                selectLGAsInState(d.properties.statename);
            }
            showPopup(event, d.properties); // Show pop-up on click
        });

    paths.exit().remove();
}

function showPopup(event, properties) {
    const popup = document.createElement('div');
    popup.className = 'map-popup';
    popup.innerHTML = `
        <strong>${properties.statename || properties.lganame || properties.wardname}</strong>
        <br>State: ${properties.statename || 'N/A'}
        <br>LGA: ${properties.lganame || 'N/A'}
        <br>Ward: ${properties.wardname || 'N/A'}
    `;

    document.body.appendChild(popup);

    // Position the popup
    const [x, y] = d3.pointer(event);
    popup.style.left = `${x + 10}px`;
    popup.style.top = `${y + 10}px`;

    // Ensure the popup is visible
    popup.style.zIndex = '1000';

    // Remove popup on click outside
    document.addEventListener('click', function removePopup() {
        popup.remove();
        document.removeEventListener('click', removePopup);
    }, { once: true });
}

function clearLayers(layerType) {
    if (layerType === "lga") {
        g.selectAll("path").filter(d => d.properties?.lgacode).remove();
    } else if (layerType === "ward") {
        g.selectAll("path").filter(d => d.properties?.wardcode).remove();
    }
}

export { selectState, selectLGAsInState, selectWardsInLGA, selectWard };
