<!DOCTYPE html>
 <html>
 <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css" />
     <title>Interactive Map with Search</title>
     <style>
         html, body {
             margin: 0;
             padding: 0;
             width: 100%;
             height: 100%;
             font-family: Arial, sans-serif;
         }
         #map {
             width: 100%;
             height: 90%;
         }
         #search-box {
             position: absolute;
             top: 10px;
             left: 10px;
             z-index: 1000;
             background: white;
             padding: 10px;
             border-radius: 5px;
             box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
         }
         #searchInput {
             width: 250px;
             padding: 8px;
             border: 1px solid #ccc;
             border-radius: 4px;
             font-size: 14px;
         }
         .search-suggestions {
             margin-top: 5px;
             border: 1px solid #ddd;
             background: white;
             max-height: 200px;
             overflow-y: auto;
             box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
         }
         .search-suggestion {
             padding: 8px;
             cursor: pointer;
         }
         .search-suggestion:hover {
             background-color: #f0f0f0;
         }
     </style>
 </head>
 <body>
     <div id="search-box">
         <input
             type="text"
             id="searchInput"
             placeholder="Search State, LGA, or Ward"
             oninput="handleSearch()"
         />
         <div id="searchSuggestions" class="search-suggestions"></div>
     </div>
     <div id="map"></div>
 
     <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
     <script>
         // State, LGA, and Ward GeoJSON data
         const state_GeoJSON = {
             "type": "FeatureCollection",
             "features": [
                 { "type": "Feature", "properties": { "statename": "State A" }, "geometry": { "type": "Polygon", "coordinates": [[[7.0, 5.0], [7.5, 5.5], [7.0, 6.0], [7.0, 5.0]]] } },
                 { "type": "Feature", "properties": { "statename": "State B" }, "geometry": { "type": "Polygon", "coordinates": [[[8.0, 5.0], [8.5, 5.5], [8.0, 6.0], [8.0, 5.0]]] } }
             ]
         };
 
         const lga_GeoJSON = {
             "type": "FeatureCollection",
             "features": [
                 { "type": "Feature", "properties": { "lganame": "LGA A1", "statename": "State A" }, "geometry": { "type": "Polygon", "coordinates": [[[7.1, 5.1], [7.4, 5.4], [7.1, 5.7], [7.1, 5.1]]] } },
                 { "type": "Feature", "properties": { "lganame": "LGA B1", "statename": "State B" }, "geometry": { "type": "Polygon", "coordinates": [[[8.1, 5.1], [8.4, 5.4], [8.1, 5.7], [8.1, 5.1]]] } }
             ]
         };
 
         const ward_GeoJSON = {
             "type": "FeatureCollection",
             "features": [
                 { "type": "Feature", "properties": { "wardname": "Ward A1", "lganame": "LGA A1" }, "geometry": { "type": "Point", "coordinates": [7.2, 5.3] } },
                 { "type": "Feature", "properties": { "wardname": "Ward B1", "lganame": "LGA B1" }, "geometry": { "type": "Point", "coordinates": [8.2, 5.3] } }
             ]
         };
 
         const map = L.map('map').setView([9.0820, 8.6753], 6);
 
         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
             attribution: '© OpenStreetMap contributors'
         }).addTo(map);
 
         const stateLayer = L.geoJSON(stateGeoJSON, {
             onEachFeature: (feature, layer) => {
                 layer.bindTooltip(feature.properties.statename, { permanent: true });
             }
         }).addTo(map);
 
         const lgaLayer = L.geoJSON(lgaGeoJSON, {
             onEachFeature: (feature, layer) => {
                 layer.bindTooltip(feature.properties.lganame, { permanent: true });
             }
         }).addTo(map);
 
         const wardLayer = L.geoJSON(wardGeoJSON, {
             onEachFeature: (feature, layer) => {
                 layer.bindTooltip(feature.properties.wardname, { permanent: true });
             }
         }).addTo(map);
 
         function handleSearch() {
             const query = document.getElementById("searchInput").value.toLowerCase();
             const suggestions = [];
 
             // Search States
             stateLayer.eachLayer(layer => {
                 if (layer.feature.properties.statename.toLowerCase().includes(query)) {
                     suggestions.push({ name: layer.feature.properties.statename, layer });
                 }
             });
 
             // Search LGAs
             lgaLayer.eachLayer(layer => {
                 if (layer.feature.properties.lganame.toLowerCase().includes(query)) {
                     suggestions.push({ name: layer.feature.properties.lganame, layer });
                 }
             });
 
             // Search Wards
             wardLayer.eachLayer(layer => {
                 if (layer.feature.properties.wardname.toLowerCase().includes(query)) {
                     suggestions.push({ name: layer.feature.properties.wardname, layer });
                 }
             });
 
             renderSuggestions(suggestions);
         }
 
         function renderSuggestions(suggestions) {
             const suggestionBox = document.getElementById("searchSuggestions");
             suggestionBox.innerHTML = "";
 
             suggestions.forEach(({ name, layer }) => {
                 const div = document.createElement("div");
                 div.className = "search-suggestion";
                 div.textContent = name;
                 div.onclick = () => {
                     map.fitBounds(layer.getBounds ? layer.getBounds() : L.latLngBounds([layer.getLatLng()]));
                 };
                 suggestionBox.appendChild(div);
             });
         }
     </script>
 </body>
 </html>